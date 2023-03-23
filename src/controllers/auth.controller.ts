/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { UserDaoTypeORMImp } from "../daos/typeorm-imp/user.dao";
import {
  COMPANY_NAME,
  MICROUTM_AUTH_URL,
  MOCK_AUTH_SERVER_API,
  MOCK_MAIL_API,
  NODE_ENV,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_URL,
  SMTP_USERNAME,
} from "../utils/config.utils";
import { logInfo } from "../utils/services/winston-logger.service";
import { TokenDao } from "../daos/token.dao";
import {
  getErrorMessageFromExpressValidatorErrors,
  logAndRespond,
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
} from "./utils";
import axios from "axios";
import {
  buildMagicSignUpHtml,
  buildMagicSignupLink,
  buildMagicSignUpText,
} from "../utils/mail-content.utils";
import { parseErrorAndRespond } from "../utils/auth.utils";
import IMailAPI from "../apis/mail/imail-api";
import MailAPIFactory from "../apis/mail/mail-api-factory";
import { NotFoundError } from "../daos/db-errors";
import Joi from "joi";
import AuthServerAPIFactory from "../apis/auth-server/auth-server-api-factory";
import { NoDataError } from "../apis/auth-server/types";

export class AuthController {
  private dao = new UserDaoTypeORMImp();
  private tokenDao = new TokenDao();
  private mailAPI: IMailAPI = MailAPIFactory.getMailAPI(
    MOCK_MAIL_API,
    SMTP_URL!,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USERNAME!,
    SMTP_PASSWORD!
  );
  private authServer = AuthServerAPIFactory.getAuthServerAPI(
    MOCK_AUTH_SERVER_API === "true"
  );

  private axiosInstance = axios.create({
    baseURL: MICROUTM_AUTH_URL,
    timeout: 10000,
  });

  /**
   * Request must have in body the next object
   * {
   *  username:String,
   *  password:String,
   *  format?:"json"
   * }
   * If user and password are valid, return token.
   * If format= json return json { token : String} else return token as a plain text
   *
   * @param  {Request} request
   * @param  {Response} response
   */
  async login(request: Request, response: Response) {
    // validate request body
    const reqBodySchema = Joi.object({
      username: Joi.string().alphanum().min(3).max(100).required(),
      password: Joi.string().alphanum().min(3).max(100).required(),
      format: "json",
    });
    const validationResult = reqBodySchema.validate(request.body);
    if (validationResult.error !== undefined)
      logAndRespond400(response, 400, validationResult.error.message);

    const username: string = request.body.username;
    const password: string = request.body.password;
    const format: string = request.body.format;
    let userFromDB: any;
    try {
      userFromDB = await this.dao.one(username);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(
          response,
          404,
          "There is no user with the credentials received"
        );
      }
      return logAndRespond500(response, 500, error);
    }

    let res;
    try {
      const extraData = new Map<string, string>([["role", userFromDB.role]]);

      res = await this.authServer.loginWithPassword(
        username,
        password,
        extraData
      );
    } catch (error: any) {
      if (error instanceof NoDataError) {
        return logAndRespond400(response, 404, "Invalid user");
      }
      let message = error.message;
      if (message === undefined) {
        message =
          error &&
          error.response &&
          error.response.data &&
          error.response.data.message
            ? error.response.data.message
            : error;
      }
      if (message === "Username is incorrect") {
        try {
          const user = await this.dao.one(username);
          if (user) {
            try {
              // This db user exists, not in auth. This might be a user pre-microservices
              // Create new user with magic link to set password
              let accessToken;
              try {
                res = await this.authServer.signUpMagic(
                  username,
                  user.email,
                  user.firstName,
                  user.lastName,
                  new Map<string, string>([["role", user.role]])
                );
              } catch (errorSignUpMagic) {
                parseErrorAndRespond(response, errorSignUpMagic);
              }
              this.mailAPI.sendMail(
                COMPANY_NAME!,
                [user.email],
                "URGENTE: Cambia tu contraseña para ingresar al sistema",
                buildMagicSignUpText(
                  username,
                  buildMagicSignupLink(username, accessToken)
                ),
                buildMagicSignUpHtml(
                  username,
                  buildMagicSignupLink(username, accessToken)
                )
              );
              return logAndRespond(
                response,
                409,
                "You will need to set up a new password, please check your email",
                null,
                "info",
                null,
                []
              );
            } catch (error) {
              console.error(error);
              return logAndRespond500(response, 500, error);
            }
          }
        } catch (error) {
          // The return of this catch already handles this case
          console.error(error);
        }
      }
      return logAndRespond(
        response,
        error.response && error.response.status ? error.response.status : 500,
        message,
        null,
        "info",
        null,
        ["password"]
      );
    }

    const { accessToken, refreshToken } = res;
    logInfo(`User logged in [username=${username}]`);

    try {
      let expireDate: Date = new Date();
      const decoded: any = jwt.decode(refreshToken);
      if (typeof decoded !== "string")
        expireDate = new Date(decoded.exp * 1000);
      response.cookie("putm-rtoken", refreshToken, {
        secure: NODE_ENV !== "dev",
        httpOnly: true,
        sameSite: NODE_ENV !== "dev" ? "none" : "lax",
        expires: expireDate,
      });
      response.cookie("putm-username", username, {
        secure: NODE_ENV !== "dev",
        httpOnly: true,
        sameSite: NODE_ENV !== "dev" ? "none" : "lax",
        expires: expireDate,
      });
    } catch (error) {
      console.log(JSON.stringify(error));
    }
    if (format) {
      return logAndRespond200(response, { token: accessToken }, ["token"]);
    } else {
      return response.send(accessToken);
    }
  }

  async relogin(request: Request, response: Response) {
    const username: string | undefined = request.cookies["putm-username"];
    const refresh_token: string | undefined = request.cookies["putm-rtoken"];
    const format: string = request.body.format;

    if (!refresh_token || !username) {
      return logAndRespond200(response, "User has sent no token or user", []);
    }
    let errorDB = false;
    let userFromDB: any;
    try {
      userFromDB = await this.dao.one(username);
    } catch (error: any) {
      if (error.message.indexOf("There is no user") > -1) {
        console.log(`User [username=${username}] does not exist in db`);
        errorDB = true;
      }
    }

    if (!userFromDB) {
      return logAndRespond400(
        response,
        400,
        "User and/or password are incorrect"
      );
    }

    try {
      const accessToken = await this.authServer.loginWithRefreshToken(
        username,
        refresh_token,
        new Map<string, string>([["role", userFromDB.role]])
      );
      if (format) {
        return logAndRespond200(response, { token: accessToken }, ["token"]);
      } else {
        return response.send(accessToken);
      }
    } catch (error) {
      if (error instanceof NoDataError) {
        return logAndRespond400(response, 404, (error as NoDataError).message);
      }
      return parseErrorAndRespond(response, error);
    }
  }

  async clearCookies(request: Request, response: Response) {
    const username: string | undefined = request.cookies["putm-username"];
    const refreshToken: string | undefined = request.cookies["putm-rtoken"];

    response.cookie("putm-rtoken", refreshToken, {
      secure: NODE_ENV !== "dev",
      httpOnly: true,
      sameSite: NODE_ENV !== "dev" ? "none" : "lax",
      maxAge: -1,
    });
    response.cookie("putm-username", username, {
      secure: NODE_ENV !== "dev",
      httpOnly: true,
      sameSite: NODE_ENV !== "dev" ? "none" : "lax",
      maxAge: -1,
    });

    return logAndRespond200(response, { message: "Cookies removed" }, []);
  }

  async mqttAcl(request: Request, response: Response) {
    //Topic will always be ##/username/tracker_id

    const { username, topic } = await request.body;
    const user = await this.dao.one(username);

    if (user === undefined) {
      return logAndRespond400(response, 401, "User unauthorized");
    }
    if (user.username === "admin") {
      return logAndRespond200(response, { message: "User authorized" }, []);
    }
    const separeted_topic = topic.split("/");
    switch (separeted_topic[0]) {
      // gufi/username/trackerId
      case "getGufi":
        if (separeted_topic[1] === username) {
          return logAndRespond200(response, { message: "User authorized" }, []);
        } else {
          return logAndRespond400(response, 401, "User unauthorized");
        }
        break;
      // position/username/trackerId
      case "position":
        if (separeted_topic[1] === username) {
          return logAndRespond200(response, { message: "User authorized" }, []);
        } else {
          return logAndRespond400(response, 401, "User unauthorized");
        }
        break;
    }
  }
}
