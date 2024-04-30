/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { UserDao } from "../daos/user.dao";
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
  frontEndUrl,
  frontEndUrlMobile,
  jwtResetPassSecret,
  jwtSecret,
} from "../utils/config.utils";
import { logInfo } from "../services/winston-logger.service";
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
  buildResetPasswordHtml,
  buildResetPasswordText,
} from "../utils/mail-content.utils";
import { parseErrorAndRespond } from "../utils/auth.utils";
import IMailAPI from "../apis/mail/imail-api";
import MailAPIFactory from "../apis/mail/mail-api-factory";
import { NotFoundError } from "../daos/db-errors";
import Joi from "joi";
import AuthServerAPIFactory from "../apis/auth-server/auth-server-api-factory";
import { Role } from "../entities/user";

export class AuthController {
  private dao = new UserDao();
  private tokenDao = new TokenDao();
  private mailAPI: IMailAPI = MailAPIFactory.getMailAPI(
    MOCK_MAIL_API,
    SMTP_URL!,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USERNAME!,
    SMTP_PASSWORD!
  );

  private axiosInstance = axios.create({
    baseURL: MICROUTM_AUTH_URL,
    timeout: 100000,
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
      username: Joi.string().min(3).max(100).required(),
      password: Joi.string().min(3).max(100).required(),
      // clientid is passed by mqtt server so I have to accept it
      clientid: Joi.string().min(1).max(100).optional(),
      format: "json",
    });
    const validationResult = reqBodySchema.validate(request.body);
    if (validationResult.error !== undefined)
      return logAndRespond400(response, 400, validationResult.error.message);

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

    const axiosInstance = this.axiosInstance;
    let res;
    try {
      const authLoginBody: any = {
        username,
        password,
        extraData: { role: userFromDB.role },
      };
      console.log(`POST auth/login body=${authLoginBody}`);
      res = await this.axiosInstance.post("auth/login", authLoginBody);
    } catch (error: any) {
      const message =
        error &&
        error.response &&
        error.response.data &&
        error.response.data.message
          ? error.response.data.message
          : error;
      if (message === "Username is incorrect") {
        try {
          const user = await this.dao.one(username);
          if (user) {
            // This db user exists, not in auth. This might be a user pre-microservices
            // Create new user with magic link to set password
            try {
              axiosInstance
                .post("auth/signup_magic", {
                  username,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  role: user.role,
                })
                .then((res) => {
                  const { accessToken } = res.data.data;
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
                })
                .catch((error) => {
                  parseErrorAndRespond(response, error);
                });
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

    const { accessToken, refreshToken } = res.data.data;
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
    this.axiosInstance
      .post("auth/login_session", {
        username,
        refresh_token,
        extraData: { role: userFromDB.role },
      })
      .then(async (res) => {
        const { accessToken } = res.data.data;
        logInfo(`User logged in [username=${username}]`);
        if (errorDB) {
          return logAndRespond500(
            response,
            500,
            `User [username=${username}] exists in auth server, but not in db`
          );
        }
        if (format) {
          return logAndRespond200(response, { token: accessToken }, ["token"]);
        } else {
          return response.send(accessToken);
        }
      })
      .catch((error) => parseErrorAndRespond(response, error));
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

  async forgotPassword(request: Request, response: Response) {
    // validate request body
    const reqBodySchema = Joi.object({
      email: Joi.string().min(3).max(255).required(),
      mobileClient: Joi.boolean().optional(),
      format: "json",
    });
    const validationResult = reqBodySchema.validate(request.body);
    if (validationResult.error !== undefined)
      return logAndRespond400(response, 400, validationResult.error.message);

    // get auth server api
    const authServerApi = AuthServerAPIFactory.getAuthServerAPI(
      MOCK_AUTH_SERVER_API === "true"
    );

    // verify user exists
    let authServerResponse: any;
    try {
      authServerResponse = await authServerApi.getUserByUsername(
        request.body.email
      );
    } catch (error) {
      return logAndRespond400(response, 404, "User not found on auth server");
    }

    // generate link
    const currentHashedPass = authServerResponse.data.data.password;

    const secret = `${jwtResetPassSecret}${currentHashedPass}`;
    const tokenPayload = {
      username: request.body.email,
      email: request.body.email,
      role: Role.PILOT, // TODO check if neccessary
    };
    const token = jwt.sign(tokenPayload, secret, { expiresIn: "15m" });
    const mobileClient = request.body.mobileClient === true;
    const link = `${
      mobileClient ? frontEndUrlMobile : frontEndUrl
    }reset-password?email=${request.body.email}&token=${token}`;

    // console.log("*******************************************");
    // console.log("jwtResetPassSecret: ", jwtResetPassSecret);
    // console.log("currentHashedPass: ", currentHashedPass);
    // console.log("secret: ", secret);
    // console.log("link :", link);
    // console.log("*******************************************");

    // send email with generated link
    this.mailAPI.sendMail(
      COMPANY_NAME!,
      [request.body.email],
      "Cambiar Contraseña",
      buildResetPasswordText(request.body.email, link),
      buildResetPasswordHtml(request.body.email, link)
    );

    // respond
    return logAndRespond200(response, null, []);
  }

  async resetPassword(request: Request, response: Response) {
    // validate request body
    const reqBodySchema = Joi.object({
      email: Joi.string().min(3).max(255).required(),
      token: Joi.string().required(),
      password: Joi.string().min(8).required(),
      format: "json",
    });
    const validationResult = reqBodySchema.validate(request.body);
    if (validationResult.error !== undefined) {
      console.log("Error al validar, ", validationResult.error);
      return logAndRespond400(response, 400, validationResult.error.message);
    }

    // get auth server api
    const authServerApi = AuthServerAPIFactory.getAuthServerAPI(
      MOCK_AUTH_SERVER_API === "true"
    );

    // get user current hashed password from auth server
    let authServerResponse: any;
    try {
      authServerResponse = await authServerApi.getUserByUsername(
        request.body.email
      );
    } catch (error) {
      return logAndRespond400(response, 404, "User not found on auth server");
    }

    // verify token
    const currentHashedPass = authServerResponse.data.data.password;
    const secret = `${jwtResetPassSecret}${currentHashedPass}`;
    // console.log("*******************************************");
    // console.log("jwtResetPassSecret: ", jwtResetPassSecret);
    // console.log("currentHashedPass: ", currentHashedPass);
    // console.log("secret: ", secret);
    // console.log("*******************************************");
    let payload: any;
    try {
      payload = jwt.verify(request.body.token, secret);
    } catch (error) {
      console.log("Error verify token: ", error);
      return logAndRespond400(response, 400, "Invalid token");
    }

    // update password
    try {
      await authServerApi.externalAuthUpdatePassword(
        payload.email,
        request.body.password
      );
    } catch (error) {
      console.log("Error updating password: ", error);
      return logAndRespond400(response, 400, "External auth password error.");
    }

    return logAndRespond200(response, null, [], 200);
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
    const method = separeted_topic[0];
    const topicUsername = separeted_topic[1];
    const validMethods = ["getGufi", "position", "expressOperation"];
    if (!validMethods.includes(method) || topicUsername !== username) {
      return logAndRespond400(response, 401, "User unauthorized");
    }
    return logAndRespond200(response, { message: "User authorized" }, []);
  }
}
