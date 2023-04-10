/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { Role, User } from "../entities/user";
import { UserDao } from "../daos/user.dao";
import {
  getPayloadFromResponse,
  parseErrorAndRespond,
} from "../utils/auth.utils";
import {
  genericTextLenghtValidation,
  ObjectKeyType,
  validateObjectKeys,
} from "../utils/validation.utils";
import { multipleFiles } from "../services/upload-file.service";
import { GetUserControllerExtension } from "./extensions/extension-implementation-factory";
import { logInfo } from "../services/winston-logger.service";
import { IUserControllerExtension } from "./extensions/extensions-interfaces";

import {
  CustomError,
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
} from "./utils";
import { InvalidDataError, NotFoundError } from "../daos/db-errors";

import * as bcrypt from "bcryptjs";
import * as _ from "lodash";
import { getDocumentById } from "./document.controller";
import { Document, setExtraField, setFileName } from "../entities/document";
import AuthServerAPIFactory from "../apis/auth-server/auth-server-api-factory";

import ConnectionError from "../apis/auth-server/errors/connection-error";
import { isNullOrUndefined, isObject, isString } from "util";
import { convertAnyToDocument, parseAnyToUser } from "../utils/parse.utils";
import { DocumentDao } from "../daos/document.dao";
import {
  adminEmail,
  APP_NAME,
  COMPANY_NAME,
  MOCK_AUTH_SERVER_API,
  MOCK_MAIL_API,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_URL,
  SMTP_USERNAME,
  USER_DOCUMENT_EXTRA_FIELDS_SCHEMA,
  USER_EXTRA_FIELDS_SCHEMA,
} from "../utils/config.utils";
import GeneralUtils from "../utils/general.utils";
import Joi from "joi";
import {
  buildConfirmationHtmlMail,
  buildConfirmationLink,
  buildConfirmationTextMail,
  buildNewUserMail,
} from "../utils/mail-content.utils";
import IMailAPI from "../apis/mail/imail-api";
import MailAPIFactory from "../apis/mail/mail-api-factory";

export class UserController {
  private dao = new UserDao();
  private authServer = AuthServerAPIFactory.getAuthServerAPI(
    MOCK_AUTH_SERVER_API === "true"
  );
  private mailAPI: IMailAPI = MailAPIFactory.getMailAPI(
    MOCK_MAIL_API,
    SMTP_URL!,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USERNAME!,
    SMTP_PASSWORD!
  );

  private userControllerExtension: IUserControllerExtension =
    GetUserControllerExtension();

  /**
   * Get all usesrs, only admin and monitor can use it.
   * @param request
   * @param response
   * @param next
   */
  async all(request: Request, response: Response) {
    const { role } = getPayloadFromResponse(response);
    if (role == Role.ADMIN || role == Role.MONITOR) {
      const { status, take, skip, filterBy, filter, orderBy, order, deleted } =
        request.query;
      //}
      const parsedTake = parseInt(take as string);
      const parsedSkip = parseInt(skip as string);
      const parsedDeleted = deleted === "true";
      let queryResult: {
        users: User[];
        count: number;
      };
      try {
        queryResult = await this.dao.all(
          status as string,
          orderBy as string,
          order as string,
          parsedTake,
          parsedSkip,
          filterBy as string,
          filter as string,
          parsedDeleted
        );
      } catch (error) {
        if (error instanceof InvalidDataError) {
          return logAndRespond400(
            response,
            400,
            (error as InvalidDataError).message
          );
        }
        return logAndRespond500(response, 500, error, true);
      }
      const { count, users: dbUsers } = queryResult;
      let usersResponse: any;
      try {
        usersResponse = await this.authServer.externalAuthUsersByUsername(
          dbUsers
        );
      } catch (error) {
        if (error instanceof ConnectionError) {
          return logAndRespond500(response, 500, error);
        }
        return logAndRespond500(response, 500, error);
      }
      const authUsers = usersResponse["data"] ? usersResponse["data"].data : [];
      let users = dbUsers.map((user) => {
        const authUser = _.find(authUsers, {
          username: user.username,
        });

        if (authUser) {
          return { ...authUser, ...user };
        } else {
          return {
            ...user,
            verified: false,
          };
        }
      });
      if (status) {
        // If filtering to show only unconfirmed or confirmed
        const verified = status === "confirmed";
        const unverified = status === "unconfirmed";
        users = _.filter(
          users,
          (user) =>
            verified ? user.verified : unverified ? !user.verified : false // Show only matching users to flag
        );
      }
      return logAndRespond200(response, { users, count }, []);
    } else {
      return logAndRespond400(response, 403, null);
    }
  }

  /**
   * Get a user. Admin can get all data, other user only get the owndata
   * @param request
   * @param response
   * @param next
   */
  async one(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    if (
      role == Role.ADMIN ||
      role == Role.MONITOR ||
      username == request.params.id
    ) {
      try {
        const user: any = await this.dao.one(request.params.id);
        delete user["__status__"];
        return logAndRespond200(response, user, []);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return logAndRespond400(
            response,
            404,
            (error as NotFoundError).message
          );
        }
        return logAndRespond500(response, 500, error);
      }
    } else {
      return logAndRespond400(response, 401, null);
    }
  }

  async save(request: Request, response: Response) {
    const { role } = getPayloadFromResponse(response);
    const dao = this.dao;
    const userParams = request.body;
    // try {
    try {
      //TODO can make a query that find by username OR email to reduce the number of queries
      const userExists = await dao.exists(userParams.username);
      const mailExists = await dao.existsMail(userParams.email);
      if (userExists || mailExists) {
        return logAndRespond400(
          response,
          400,
          "username or email already exists"
        );
      }

      if (role == Role.ADMIN) {
        const password = userParams.password;

        //if password lenght is less than 8 characters, return error
        if (!password || password.length < 8) {
          return logAndRespond400(
            response,
            400,
            "password must be at least 8 characters long"
          );
        }
        let userRole: Role;
        switch (userParams.role.toLowerCase()) {
          case "admin":
            userRole = Role.ADMIN;
            break;
          case "monitor":
            userRole = Role.MONITOR;
            break;
          case "pilot":
            userRole = Role.PILOT;
        }
        const user: User = new User(
          userParams.username,
          userParams.firstName,
          userParams.lastName,
          userParams.email,
          userRole!
        );
        user.extra_fields = userParams.extra_fields;
        user.verified = false;

        let existing = false;
        try {
          await dao.one(user.username);
          existing = true;
        } catch (error) {
          if (!(error instanceof NotFoundError)) {
            throw error;
          }
        }

        const errors = validateUser(user);
        if (errors.length == 0) {
          if (!existing) {
            if (!password)
              return logAndRespond400(
                response,
                400,
                "You need to supply a password"
              );
          } else {
            if (password) {
              throw new CustomError(
                'You can not use this endpoint to update the password of the user. Please remove the "password" parameter from the request.',
                null
              );
            }
          }
          const insertedDetails = await dao.save(user);
          await this.authServer.createUserExternalAuth(
            insertedDetails,
            password,
            true
          );
          return logAndRespond200(response, user, []);
        } else {
          return logAndRespond400(response, 400, errors.join(" "));
        }
      } else {
        return logAndRespond400(response, 403, null);
      }
    } catch (error) {
      console.log(error);
      if (error instanceof CustomError) {
        return logAndRespond400(response, 400, error.message);
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
    // } catch (err) {
    // 	return logAndRespond400(response, 400, err.message);
    // }
  }

  /**
   * Create a new user PILOT with status UNCONFIRMED pass by a POST request
   * and send a confirmation mail
   * @example {
   *          username: "AnOtherUserToInsert",
   *          email: `anotherusertoinsert@dronfies.com`,
   *          firstName: `Any`,
   *          lastName: `Name`,
   *          password: `password`,
   *          role: Role.PILOT
   *      }
   * @param request
   * @param response
   * @param next
   */
  async userRegister(request: Request, response: Response) {
    const dao = this.dao;
    const userControllerExtension = this.userControllerExtension;

    const origin = request.headers.origin;
    const userParams = request.body;

    const reqBodySchema = Joi.object({
      username: Joi.string().min(3).max(100).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).max(100).required(),
      firstName: Joi.string().min(3).max(100).required(),
      lastName: Joi.string().min(3).max(100).required(),
      extra_fields: Joi.object().optional(),
      role: Joi.string().optional(),
    });
    const validationResult = reqBodySchema.validate(userParams);
    if (validationResult.error !== undefined)
      logAndRespond400(response, 400, validationResult.error.message);

    if (
      userParams.role !== undefined &&
      userParams.role !== null &&
      (userParams.role as string).toLowerCase() !== "pilot"
    ) {
      logAndRespond400(response, 400, "Invalid role received");
    }

    try {
      this.validateExtraFields(userParams.extra_fields);
    } catch (error) {
      return logAndRespond400(
        response,
        400,
        `Invalid extra fields (${(error as Error).message})`
      );
    }

    try {
      const userExists = await dao.exists(userParams.username);
      const mailExists = await dao.existsMail(userParams.email);
      if (userExists || mailExists) {
        return logAndRespond400(
          response,
          400,
          "username or email already exists"
        );
      }
      const password = userParams.password;
      if (password.length < 8) {
        return logAndRespond400(
          response,
          400,
          "password must be at least 8 characters long"
        );
      }
      const user: User = new User(
        userParams.username,
        userParams.firstName,
        userParams.lastName,
        userParams.email,
        Role.PILOT
      );
      user.verified = false;
      const role = Role.PILOT;
      user.role = role;
      if (isObject(userParams.extra_fields)) {
        user.extra_fields = userParams.extra_fields;
      }

      user.verification_token = bcrypt.hashSync(user.email, 8);
      user.verified = false;
      user.settings = "EN";

      // console.log('Register request', request.headers.origin);

      const errors = validateUser(user);
      if (errors.length == 0) {
        const insertedDetails = await dao.save(user);
        // console.log(JSON.stringify(user));
        sendMailToConfirm(user, origin, this.mailAPI);
        //Also send mail to admin
        sendMailToAdmin(user, this.mailAPI);
        await this.authServer.createUserExternalAuth(
          insertedDetails,
          password,
          false
        );
        return logAndRespond200(response, user, []);
      } else {
        return logAndRespond400(response, 400, errors.join(" "));
      }
    } catch (error: any) {
      if (error.detail) {
        if (error.detail.startsWith("Key (username)")) {
          return logAndRespond400(
            response,
            400,
            `Username ${request.body.username} already exists.`
          );
        }
        if (error.detail.startsWith("Key (email)")) {
          return logAndRespond400(
            response,
            400,
            `Email ${request.body.email} already exists.`
          );
        }
        return logAndRespond400(response, 400, "Register error");
      } else {
        return logAndRespond400(response, 400, error.message);
      }
    }
  }

  async updateUser(request: Request, response: Response) {
    const { role, username: logged_username } =
      getPayloadFromResponse(response);
    const dao = this.dao;
    // const axiosInstance = this.axiosInstance;

    const requestBody = request.body;
    if (!isString(requestBody.username)) {
      return logAndRespond400(response, 400, "Invalid username");
    }
    const requestBodyKeys = Object.keys(requestBody);
    if (requestBodyKeys.length <= 1) {
      // it meanse we are only receiving the username, so there is no data to update
      return logAndRespond400(
        response,
        400,
        "You need to send at least one value to update"
      );
    }
    if (requestBodyKeys.includes("verification_token")) {
      return logAndRespond400(
        response,
        400,
        "Key verification_token must not be sent"
      );
    }
    if (requestBodyKeys.includes("verified")) {
      return logAndRespond400(response, 400, "Key verified must not be sent");
    }
    // if the user is PILOT, we check that the role parameter was not received
    if (role === Role.PILOT && Object.keys(requestBody).includes("role")) {
      return logAndRespond400(
        response,
        400,
        'Pilot users can not update their "role" (remove the "role" key from the request body)'
      );
    }

    // verify there is a user with the username received
    let userToUpdate: User;
    try {
      userToUpdate = await this.dao.one(requestBody.username);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(
          response,
          404,
          `There is no user with the username received (username=${requestBody.username})`
        );
      }
      return logAndRespond500(response, 500, error);
    }

    let user: any;
    try {
      if (requestBody.role === undefined) {
        requestBody.role = userToUpdate.role;
      }
      user = parseAnyToUser(requestBody);
    } catch (error) {
      console.log(error);
      return logAndRespond400(response, 400, `${(error as Error).message}`);
    }
    const usernameToUpdate = user.username;

    try {
      if (role == Role.ADMIN || usernameToUpdate == logged_username) {
        //If the user asking for the change is not an admin then delete role to update
        if (role != Role.ADMIN) {
          if (user.role) {
            delete user.role;
          }
        } else {
          if (user.role) {
            switch (user.role.toLowerCase()) {
              case "admin":
                user.role = Role.ADMIN;
                break;
              case "monitor":
                user.role = Role.MONITOR;
                break;
              case "pilot":
                user.role = Role.PILOT;
            }
          }
        }

        const errors = validateUser(user);

        if (errors.length == 0) {
          const oldUser: unknown = await dao.one(user.username);
          const toUpdate = Object.assign({}, oldUser, user);
          await dao.update(toUpdate);
          const updatedUser = await dao.one(user.username);
          // await axiosInstance.put('auth/update', {
          // 	username: insertedDetails.username,
          // 	verified: user.verified ? JSON.parse(request.body.verified) : undefined
          // });
          return logAndRespond200(response, updatedUser, []);
        } else {
          return logAndRespond400(response, 400, errors.join(", "));
        }
      } else {
        return logAndRespond400(response, 401, null);
      }
    } catch (error) {
      return logAndRespond500(response, 500, error);
    }
  }

  /**
   * Updates an User's password
   * @example {
   *          username: "AnOtherUserToInsert",
   *          email: `anotherusertoinsert@dronfies.com`,
   *          firstName: `Any`,
   *          lastName: `Name`,
   *          password: `password`,
   *          role: Role.PILOT
   *      }
   * @param request
   * @param response
   */
  async updateUserPassword(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    try {
      // the password can be change by any admin user, or by the owner of the password
      // console.log('pegandole auth');
      if (role == Role.ADMIN || username == request.params.id) {
        if (!validateRequestBody(request.body, ["password"])) {
          return logAndRespond400(
            response,
            400,
            'Expected object {"password": "<VALUE>"}'
          );
        }
        const { password } = request.body;
        const username = request.params.id;

        await this.authServer.externalAuthUpdatePassword(username, password);
        return logAndRespond200(response, { message: "Password updated" }, []);
      } else {
        return logAndRespond400(response, 401, null);
      }
    } catch (error) {
      return parseErrorAndRespond(response, error);
    }
  }

  /**
   * Change the status of user with username passed and status
   * @example {
   *  username: "userToUpdate",
   *  status: status.`
   * }
   * @param request
   * @param response
   */
  async updateUserStatus(request: Request, response: Response) {
    const payload = getPayloadFromResponse(response);
    let role;
    if (payload) role = payload.role;
    const dao = this.dao;

    const verified = !!request.body.verified;
    const username = request.body.username;
    const token = request.body.token;

    try {
      const user = await dao.one(username);
      if (role !== Role.ADMIN)
        if (!bcrypt.compareSync(user.email, token)) {
          console.log(
            "bcrypt",
            token,
            bcrypt.hashSync(user.email, 8),
            user.email
          );
          return logAndRespond400(response, 401, "The token is invalid");
        }
      try {
        await this.authServer.externalAuthUpdateUser({
          username: user.username,
          verified: verified,
        });

        logInfo(`User ${user.username} change status to ${verified}`);
        return logAndRespond200(response, { message: "Status updated" }, []);
      } catch (error: any) {
        if (error.response?.status === 404) {
          return logAndRespond400(
            response,
            404,
            "User did not log in for the first time"
          );
        }
        return logAndRespond400(response, 404, null);
      }
    } catch (error) {
      console.error(error);
      return logAndRespond400(response, 404, null);
    }
  }

  /**
   * Return true if the user exists
   * @param request
   * @param response
   * @param next
   */
  async userExists(request: Request, response: Response) {
    if (!Object.prototype.hasOwnProperty.call(request, "params")) {
      return logAndRespond400(
        response,
        400,
        "username was not received in the path of the request"
      );
    } else if (
      !Object.prototype.hasOwnProperty.call(request.params, "username")
    ) {
      return logAndRespond400(
        response,
        400,
        "username was not received in the path of the request"
      );
    }
    const username = request.params.username;
    try {
      if (await this.dao.exists(username)) {
        return logAndRespond200(response, { exists: true }, []);
      } else {
        return logAndRespond200(response, { exists: false }, []);
      }
    } catch (err) {
      return logAndRespond500(response, 500, err);
    }
  }

  async remove(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    const usernameToRemove = request.params.id;
    if (role == Role.ADMIN || username == usernameToRemove) {
      try {
        await this.dao.disable(usernameToRemove);

        await this.authServer.externalAuthUpdateUser({
          username: usernameToRemove,
          disabled: true,
        });
        // await this.axiosInstance.put('auth/update',);
        return logAndRespond200(response, { removed: true }, []);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw logAndRespond400(
            response,
            404,
            (error as NotFoundError).message
          );
        }
        return logAndRespond500(response, 500, error);
      }
    } else {
      return logAndRespond400(response, 401, null);
    }
  }

  async enable(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    const usernameToEnable = request.params.username;
    if (role == Role.ADMIN || username == usernameToEnable) {
      try {
        await this.dao.enable(usernameToEnable);
        await this.authServer.externalAuthUpdateUser({
          username: usernameToEnable,
          disabled: false,
        });

        return logAndRespond200(response, { enabled: true }, []);
      } catch (error) {
        return logAndRespond400(response, 400, null);
      }
    } else {
      return logAndRespond400(response, 401, null);
    }
  }

  async addDocument(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    const dao = this.dao;
    const upload = multipleFiles(undefined, undefined);
    const userControllerExtension = this.userControllerExtension;
    upload(request, response, async function (err: any) {
      if (err) {
        logAndRespond500(response, 500, err.message);
      }
      const usernameToAdd = request.params.username;
      let document: Document;
      try {
        const requestBody = request.body;
        requestBody["valid"] = false;
        document = convertAnyToDocument(requestBody);
      } catch (error) {
        return logAndRespond400(response, 400, `${(error as Error).message}`);
      }
      if (role == Role.PILOT && username !== usernameToAdd) {
        return logAndRespond400(
          response,
          401,
          `User ${username} can't add a document to user ${usernameToAdd}`
        );
      }
      try {
        setFileName(request, document);
        delete document.id;
        await new DocumentDao().save(document);
        const user: any = await dao.one(usernameToAdd);
        if (isNullOrUndefined(user.extra_fields)) {
          user.extra_fields = {};
        }
        const typedDocument = document;
        if (user.extra_fields["documents"] === undefined) {
          user.extra_fields["documents"] = [];
        }
        const userDocuments = user.extra_fields["documents"];
        if (isNullOrUndefined(userDocuments) || !Array.isArray(userDocuments)) {
          user.extra_fields["documents"] = [];
        }
        user.extra_fields["documents"].push(typedDocument);
        await dao.update(user);
        userControllerExtension.postProcessAddDocument(username, typedDocument);
        return logAndRespond200(response, user, []);
      } catch (error) {
        return logAndRespond400(
          response,
          400,
          GeneralUtils.getErrorMessage(error)
        );
      }
    });
  }

  async updateDocument(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    const dao = this.dao;
    const upload = multipleFiles(undefined, undefined);
    const userControllerExtension = this.userControllerExtension;
    upload(request, response, async function (err: any) {
      if (err) {
        return logAndRespond500(response, 500, err.message);
      }
      const usernameToUpdateDoc = request.params.username;
      const document = request.body;
      if (isNullOrUndefined(document.id)) {
        return logAndRespond400(response, 400, "Invalid document id");
      }
      const documentId = document.id;

      if (role == Role.PILOT && username !== usernameToUpdateDoc) {
        return logAndRespond400(
          response,
          401,
          `User ${username} can't add a document to user ${usernameToUpdateDoc}`
        );
      }

      try {
        setExtraField(document);
        setFileName(request, document);
        document.valid = false;
        // validateDocument(document);
        const doc = getDocumentById(documentId);
        if (!doc) {
          return logAndRespond400(
            response,
            404,
            `Docuemnt ${documentId} not exists`
          );
        }
        const user: any = await dao.one(usernameToUpdateDoc);
        if (user.extra_fields["documents"] === undefined) {
          user.extra_fields["documents"] = [];
        }
        const documents = (user.extra_fields as { documents: Array<unknown> })
          .documents;
        const documentIndex = documents.findIndex(
          (document) => (document as { id: string }).id === documentId
        );
        if (documentIndex >= 0) {
          const documentToUpdate = documents.splice(documentIndex, 1)[0];

          const newDocumentAux: Document = {
            ...(documentToUpdate as object),
            ...document,
            valid: false,
          };
          const newDocument = getTypedDocument(newDocumentAux);
          newDocument.id = documentId;
          documents.push(newDocument);
          await dao.update(user);
          userControllerExtension.postProcessAddDocument(
            user.username,
            newDocument
          );

          return logAndRespond200(response, user, []);
        } else {
          return logAndRespond400(
            response,
            404,
            `User ${username} has not document ${documentId} `
          );
        }
      } catch (error: any) {
        console.log(error);
        return logAndRespond400(response, 400, error.message);
      }
    });
  }

  async deleteDocument(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    try {
      const usernameToRemoveDocument = request.params.username;
      const documentId = request.params.documentId;

      if (role == Role.PILOT && username !== usernameToRemoveDocument) {
        return logAndRespond400(
          response,
          401,
          `User ${username} can't remove a document from user ${usernameToRemoveDocument}`
        );
      }
      const user: any = await this.dao.one(usernameToRemoveDocument);
      const documents = user.extra_fields["documents"];
      const documentIndex = documents.findIndex(
        (document: any) => document.id === documentId
      );
      if (documentIndex >= 0) {
        documents.splice(documentIndex, 1);
        await this.dao.update(user);
        return logAndRespond200(response, user, []);
      } else {
        return logAndRespond400(
          response,
          404,
          `User ${username} hasn't document ${documentId}`
        );
      }
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  async getDocumentTags(request: Request, response: Response) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const documentSchemas = require(USER_DOCUMENT_EXTRA_FIELDS_SCHEMA!);
      const documentTags = Object.keys(documentSchemas);
      return logAndRespond200(response, documentTags, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  async getDocumentExtraFieldSchemas(request: Request, response: Response) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const documentSchemas = require(USER_DOCUMENT_EXTRA_FIELDS_SCHEMA!);
      return logAndRespond200(response, documentSchemas, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  async getDocumentExtraFieldSchemaByTag(request: Request, response: Response) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const documentSchemas = require(USER_DOCUMENT_EXTRA_FIELDS_SCHEMA!);
      const deocumentTag = request.params.tag;
      const documentSchema = documentSchemas[deocumentTag];
      if (documentSchema) {
        return logAndRespond200(response, documentSchema, []);
      } else {
        return logAndRespond400(response, 404, "Tag not found");
      }
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  validateExtraFields(extraFields: any): void {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const userExtraFieldsSchema = require(USER_EXTRA_FIELDS_SCHEMA!);
    if (!isObject(userExtraFieldsSchema)) return;
    const userExtraFieldsKeys = Object.keys(userExtraFieldsSchema);
    for (let i = 0; i < userExtraFieldsKeys.length; i++) {
      const key = userExtraFieldsKeys[i];
      const userExtraField = userExtraFieldsSchema[key];
      this.validateExtraFieldsContainsExtraField(
        extraFields,
        key,
        userExtraField
      );
    }
  }

  validateExtraFieldsContainsExtraField(
    extraFields: any,
    extraFieldName: string,
    extraFieldDefinition: any
  ) {
    if (!isObject(extraFields)) {
      throw new Error(
        `extra fields must be an object (extra_fields=${extraFields})`
      );
    }
    if (!isObject(extraFieldDefinition)) return;
    try {
      validateObjectKeys(
        extraFieldDefinition,
        [
          { name: "type", type: ObjectKeyType.STRING },
          { name: "required", type: ObjectKeyType.BOOLEAN },
          { name: "min_lenght", type: ObjectKeyType.NUMBER },
          { name: "max_lenght", type: ObjectKeyType.NUMBER },
        ],
        []
      );
    } catch (error) {
      return;
    }
    const required = extraFieldDefinition["required"] as boolean;
    if (!required) return;
    if (!Object.keys(extraFields).includes(extraFieldName)) {
      throw new Error(`'${extraFieldName}' key is missing in extra fields`);
    }
    const extraField = extraFields[extraFieldName];
    if (extraFieldDefinition["type"] === "String") {
      if (!isString(extraField)) {
        throw new Error(
          `'${extraFieldName}' key in extra fields must be a string`
        );
      }
      const extraFieldStringValue = `${extraField}`;
      const minLenght = extraFieldDefinition["min_lenght"] as number;
      const maxLenght = extraFieldDefinition["max_lenght"] as number;
      if (
        extraFieldStringValue.length < minLenght ||
        extraFieldStringValue.length > maxLenght
      ) {
        throw new Error(
          `The length of the extra field '${extraFieldName}' must be between ${minLenght} y ${maxLenght}`
        );
      }
    }
    // TODO: IMPLEMENT THE OTHER TYPES
  }
}

export function validateEmail(mail: any) {
  return /^(.+)@(.+)$/.test(mail);
}

function validateUser(user: User) {
  const errors = [];
  if (!validateEmail(user.email)) {
    errors.push("Invalid email");
  }
  if (!genericTextLenghtValidation(user.firstName)) {
    errors.push("Invalid first name");
  }
  if (!genericTextLenghtValidation(user.lastName)) {
    errors.push("Invalid last name");
  }
  /*if (!genericTextLenghtValidation(user.password)) {
        errors.push("Invalid password")
    }*/
  if (!genericTextLenghtValidation(user.username)) {
    errors.push("Invalid username");
  }
  return errors;
}

function validateRequestBody(requestBody: any, expectedKeys: any) {
  const requestBodyKeys = Object.keys(requestBody);
  if (requestBodyKeys.length !== expectedKeys.length)
    for (let i = 0; i < requestBodyKeys.length; i++) {
      const key = requestBodyKeys[i];
      if (!expectedKeys.includes(key)) {
        return false;
      }
    }
  for (let i = 0; i < expectedKeys.length; i++) {
    const key = expectedKeys[i];
    if (!requestBodyKeys.includes(key)) {
      return false;
    }
  }
  return true;
}

function getTypedDocument(document: any): Document {
  const doc = new Document(
    document["name"],
    document["tag"],
    document["valid_until"],
    document["observations"],
    document["valid"],
    document["extra_fields"]
  );
  return doc;
}

function sendMailToConfirm(user: any, url: any, mailAPI: IMailAPI) {
  const subject = `${user.firstName}, por favor, confirma tu nuevo usuario en ${APP_NAME}`;
  const link = buildConfirmationLink(
    user.username,
    user.verification_token,
    url
  );
  const textContent = buildConfirmationTextMail(user.username, link, APP_NAME!);
  const htmlContent = buildConfirmationHtmlMail(user.username, link, APP_NAME!);
  mailAPI.sendMail(
    COMPANY_NAME!,
    [user.email],
    subject,
    textContent,
    htmlContent
  );
}
function sendMailToAdmin(user: any, mailAPI: IMailAPI) {
  const adminSubject = `Nuevo usuario registrado en ${APP_NAME}`;
  const adminTextContent = `El usuario ${user.username} se ha registrado en ${APP_NAME}`;
  const adminHtmlContent = buildNewUserMail(user);
  mailAPI.sendMail(
    COMPANY_NAME!,
    adminEmail,
    adminSubject,
    adminTextContent,
    adminHtmlContent
  );
}
