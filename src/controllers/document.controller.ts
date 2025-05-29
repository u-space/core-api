/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { extisFile, listDocumentFiles, removeFiles } from "../utils/file.utils";
import { DocumentDao } from "../daos/document.dao";
import { Document, ReferencedEntityType } from "../entities/document";
import { logAndRespond200, logAndRespond400, logAndRespond500 } from "./utils";
import { getPayloadFromResponse } from "../utils/auth.utils";
import { Role, User } from "../entities/user";
import { UserDao } from "../daos/user.dao";
import { buildNewObservationMail } from "../utils/mail-content.utils";
import IMailAPI from "../apis/mail/imail-api";
import MailAPIFactory from "../apis/mail/mail-api-factory";
import {
  COMPANY_NAME,
  MOCK_MAIL_API,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_URL,
  SMTP_USERNAME,
  uploadFolder,
} from "../utils/config.utils";
import { NotFoundError } from "../daos/db-errors";
import { isString } from "lodash";
import GeneralUtils from "./utils/general.utils";
import { VehicleDao } from "../daos/vehicle.dao";
import { VehicleReg } from "../entities/vehicle-reg";

export class DocumentRestController {
  private dao = new DocumentDao();
  private mailAPI: IMailAPI = MailAPIFactory.getMailAPI(
    MOCK_MAIL_API,
    SMTP_URL!,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USERNAME!,
    SMTP_PASSWORD!
  );

  async all(request: Request, response: Response) {
    try {
      const list = await this.dao.all();
      const withExists = list.map((doc) => {
        const newDoc = { ...doc, exits: extisFile(doc.getFileName()) };
        return newDoc;
      });
      console.log("list", JSON.stringify(withExists, null, 2));
      return logAndRespond200(response, list, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  async one(request: Request, response: Response) {
    try {
      const one = await this.dao.one(request.params.id);
      return logAndRespond200(response, one, []);
    } catch (error) {
      return logAndRespond400(response, 404, null);
    }
  }

  async save(request: Request, response: Response) {
    try {
      const requestDocument = request.body;
      const doc = new Document(
        requestDocument.name,
        requestDocument.tag,
        requestDocument.valid_until,
        requestDocument.observations,
        requestDocument.valid,
        requestDocument.extra_fields,
        requestDocument.notifications,
        requestDocument.referenced_entity_id,
        requestDocument.referenced_entity_type,
        requestDocument.deletedAt
      );

      const savedDoc = await saveDocument(doc);

      return logAndRespond200(response, savedDoc, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  async remove(request: Request, response: Response) {
    return response.sendStatus(501);
  }

  async validateDocument(request: Request, response: Response) {
    this.patchValidateAndInvalidate(request, response, true);
  }

  async invalidateDocument(request: Request, response: Response) {
    this.patchValidateAndInvalidate(request, response, false);
  }

  async softDeleteDocument(request: Request, response: Response) {
    try {
      const { role } = getPayloadFromResponse(response);
      if (role != Role.ADMIN)  {
        return logAndRespond400(response, 403, null);
      }
      const documentId = request.params.id;
      let document: Document;
      try {
        document = await this.dao.one(documentId);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return logAndRespond400(
            response,
            404,
            `There is no document with the id received (id=${documentId})`
          );
        }
        return logAndRespond500(response, 500, error);
      }

      this.dao.softDelete(documentId);
   
      return logAndRespond200(response, document, []);
    } catch (error) {
      return logAndRespond500(response, 500, error);
    }
  }

  async sendObservation(request: Request, response: Response) {
    if (!isString(request.body.observation))
      return logAndRespond400(response, 400, "Invalid observation");
    if (!isString(request.body.userToNotify))
      return logAndRespond400(response, 400, "Invalid userToNotify");

    const observation = request.body.observation;
    const usernameToSendMail = request.body.userToNotify;

    let userToSendMail: User;
    try {
      userToSendMail = await new UserDao().one(usernameToSendMail);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(
          response,
          404,
          `There is no user with the username received (username=${usernameToSendMail})`
        );
      }
      return logAndRespond500(response, 500, error);
    }
    const sendToMail = userToSendMail.email;

    let document: Document;
    try {
      document = await this.dao.one(request.params.id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(
          response,
          404,
          `There is no document with the received id (id=${request.params.id})`
        );
      }
      return logAndRespond500(response, 500, error);
    }

    document.observations = observation;
    try {
      document = await this.dao.update(document);
    } catch (error) {
      return logAndRespond500(response, 500, error);
    }
    const mailContent = buildNewObservationMail(document);
    this.mailAPI.sendMail(
      COMPANY_NAME!,
      [sendToMail],
      "Se agregó una observación sobre un documento",
      mailContent,
      mailContent
    );
    return logAndRespond200(response, document, []);
  }

  async getDocumentExtraFieldSchema(request: Request, response: Response) {
    try {
      const document = await this.dao.one(request.params.id);
      return logAndRespond200(response, document.getExtraFieldSchema(), []);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(
          response,
          400,
          (error as NotFoundError).message
        );
      }
      return logAndRespond400(response, 404, null);
    }
  }

  async removeOrphanFiles(request: Request, response: Response) {
    try {
      const removedFiles = await removeOrphanFiles();
      return logAndRespond200(response, removedFiles, []);
    } catch (error) {
      return logAndRespond400(response, 404, null);
    }
  }

  async getUpload(req: Request, res: Response) {
    const id = req.params.id;
    const filePath = `${uploadFolder}/${id}`;
    try {
      const vec = filePath.split(".");
      const fileExtension = vec[vec.length - 1];
      res.contentType(
        GeneralUtils.getContentTypeByFileExtension(fileExtension)
      );
    } catch (error) {
      // We try to set the content type. If we can not, we send the response without content type
    }
    res.sendFile(filePath); // Set disposition and send it.
  }

  private async patchValidateAndInvalidate(
    request: Request,
    response: Response,
    valid: boolean
  ) {
    try {
      const { role } = getPayloadFromResponse(response);
      if (!(role == Role.ADMIN || role == Role.REMOTE_SENSOR)) {
        return logAndRespond400(response, 403, null);
      }
      const documentId = request.params.id;
      let document: Document;
      try {
        document = await this.dao.one(documentId);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return logAndRespond400(
            response,
            404,
            `There is no document with the id received (id=${documentId})`
          );
        }
        return logAndRespond500(response, 500, error);
      }

      const validUntil = new Date(document.valid_until || "");
      const today = new Date();
      if (
        valid &&
        validUntil &&
        validUntil.toISOString() < today.toISOString()
      ) {
        console.log("expired");
        return logAndRespond400(response, 400, "The document is expired");
      }
      const schema = document.getExtraFieldSchema();
      const vehicleOrUser = await getReferencedEntity(document);
      if (
        valid &&
        schema &&
        schema.__metadata &&
        schema.__metadata.max_valid_documents == 1
      ) {
        if (vehicleOrUser) {
          const documents = vehicleOrUser.extra_fields["documents"];
          // check other documents with the same tag and change to invalid
          for (let i = 0; i < documents.length; i++) {
            if (
              documents[i].id !== documentId &&
              documents[i].valid &&
              documents[i].tag == document.tag
            ) {
              console.log(
                `Document ${documents[i].id} is valid, and change to invalid`
              );
              documents[i].valid = false;
              await this.dao.update(documents[i]);
            }
          }
        }
      }


      document.valid = valid;
      document = await this.dao.update(document);
      if (document.tag === "remote_sensor_id" && vehicleOrUser && vehicleOrUser instanceof VehicleReg) {
        const vehicle = vehicleOrUser;
        vehicle.remoteSensorValid = valid;
        const vehicleDao = new VehicleDao()
        const updatedVehicle = await vehicleDao.updateOnlyReceivedProperties(vehicle);
        console.log("updated vehicle", updatedVehicle);
      }
      return logAndRespond200(response, document, []);
    } catch (error) {
      return logAndRespond500(response, 500, error);
    }
  }
}

export const saveDocument = async (document: Document) => {
  const dao = new DocumentDao();
  await dao.save(document);
  return document;
};

export const getDocumentById = async (documentID: string) => {
  const dao = new DocumentDao();
  return await dao.one(documentID);
};

export const getOrphanFiles = async () => {
  const dao = new DocumentDao();
  const documents = await dao.all();
  const pathFiles = listDocumentFiles();
  const orphanFiles: any = [];
  pathFiles.forEach((file) => {
    if (!documents.find((doc) => doc.getFileName() === file)) {
      orphanFiles.push(file);
    }
  });
  console.log("orphanFiles", JSON.stringify(orphanFiles, null, 2));
  return orphanFiles;
};

export const removeOrphanFiles = async () => {
  const orphanFiles = await getOrphanFiles();
  return removeFiles(orphanFiles);
};

export const getReferencedEntity = async (document: Document) => {
  if (
    document.referenced_entity_type === ReferencedEntityType.VEHICLE &&
    document.referenced_entity_id
  ) {
    const vehicleDao = new VehicleDao();
    const vehicle = await vehicleDao.one(document.referenced_entity_id);
    return vehicle;
  } else if (
    document.referenced_entity_type === ReferencedEntityType.USER &&
    document.referenced_entity_id
  ) {
    const userDao = new UserDao();
    const user = await userDao.one(document.referenced_entity_id);
    return user;
  } else return null;
};
