/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextFunction, Request, Response } from "express";
import { VehicleDao } from "../daos/vehicle.dao";
import { Role, User } from "../entities/user";
import {
  VehicleAuthorizeStatus,
  VehicleReg,
  parseVehicleAuthorizeStatus,
  parseVehicleType,
  vehicleRegSchema,
  vehicleType,
} from "../entities/vehicle-reg";
import { multipleFiles } from "../services/upload-file.service";
import { getPayloadFromResponse } from "../utils/auth.utils";
import {
  generateAuthorizeVehicleMailHTML,
  generateAuthorizeVehicleMailText,
} from "../utils/mail-content.utils";

import { GetVehicleControllerExtension } from "./extensions/extension-implementation-factory";
import { IVehicleControllerExtension } from "./extensions/extensions-interfaces";

import { isArray, isObject, isString } from "util";
import AuthServerAPIFactory from "../apis/auth-server/auth-server-api-factory";
import IMailAPI from "../apis/mail/imail-api";
import MailAPIFactory from "../apis/mail/mail-api-factory";
import { InvalidDataError, NotFoundError } from "../daos/db-errors";
import { DocumentDao } from "../daos/document.dao";
import {
  Document,
  ReferencedEntityType,
  setExtraField,
  setFileName,
} from "../entities/document";
import {
  COMPANY_NAME,
  MOCK_AUTH_SERVER_API,
  MOCK_MAIL_API,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_URL,
  SMTP_USERNAME,
  VEHICLE_DOCUMENT_EXTRA_FIELDS_SCHEMA,
} from "../utils/config.utils";
import { filterOrderPageAndSkipCollection } from "../utils/entities.utils";
import GeneralUtils from "../utils/general.utils";
import { convertAnyToDocument } from "../utils/parse.utils";
import { getDocumentById } from "./document.controller";
import {
  CustomError,
  getPaginationParametersFromRequestQuery,
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
} from "./utils";

export class VehicleController {
  private dao = new VehicleDao();
  private documentDao = new DocumentDao();
  private vehicleControllerExtension: IVehicleControllerExtension =
    GetVehicleControllerExtension();
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

  /**
   * Get vehicles, if user role is admin get all vehicles, if user is Pilot get only the owned vehicles
   * @param request
   * @param response
   * @param next
   */
  async all(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    try {
      const { take, skip, filterBy, filter, orderBy, order } =
        getPaginationParametersFromRequestQuery(request.query);
      if (
        role == Role.ADMIN ||
        role == Role.MONITOR ||
        role == Role.REMOTE_SENSOR ||
        role == Role.AIR_TRAFIC
      ) {
        const showPendingVehicles = request.query.showFullAuthorized === undefined ? undefined : request.query.showPendingVehicles === 'true';
        return logAndRespond200(
          response,
          await this.dao.all(orderBy, order, take, skip, filterBy, filter, showPendingVehicles),
          []
        );
      } else {
        const allVehicles = await this.dao.allByUser(username);
        const { result: vehicles, count } = filterOrderPageAndSkipCollection(
          allVehicles,
          filterBy,
          filter,
          orderBy,
          order,
          skip,
          take
        );
        return logAndRespond200(response, { vehicles, count }, []);
      }
    } catch (error) {
      if (error instanceof InvalidDataError || error instanceof CustomError) {
        return logAndRespond400(
          response,
          400,
          GeneralUtils.getErrorMessage(error)
        );
      } else {
        return logAndRespond500(response, 500, error, true);
      }
    }
  }

  /**
   * Get vehicles, that the user is operator
   * @param request
   * @param response
   * @param next
   */
  async allVehiclesOperator(request: Request, response: Response) {
    const { role } = getPayloadFromResponse(response);
    const { username: usernameFromPayload } = getPayloadFromResponse(response);

    try {
      const { take, skip, filterBy, filter } = request.query;
      const parsedTake = parseInt(take as string);
      const parsedSkip = parseInt(skip as string);
      if (role == Role.ADMIN || role == Role.MONITOR) {
        let { username } = request.query;
        username = username ? username : usernameFromPayload;
        const result = await this.dao.vehiclesByOperator(
          username,
          parsedTake,
          parsedSkip,
          filterBy as string,
          filter as string
        );
        return logAndRespond200(response, result, []);
      } else if (role == Role.PILOT) {
        return logAndRespond200(
          response,
          await this.dao.vehiclesByOperator(
            usernameFromPayload,
            parsedTake,
            parsedSkip,
            filterBy as string,
            filter as string
          ),
          []
        );
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(response, 404, error.message);
      } else if (error instanceof InvalidDataError) {
        return logAndRespond400(response, 400, error.message);
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
  }

  //solo los propios si role piloto
  /**
   * Get one vehicle . Admin can see all vehicles, pilot only owned vehicles
   * @example /vehicle/bd9c2ea6-7ab7-442e-b99c-78890181c198
   * @param request
   * @param response
   * @param next
   */
  async one(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    const uvinReceived = request.params.id;
    try {
      if (role == Role.ADMIN
        || role == Role.MONITOR
        || role == Role.AIR_TRAFIC) {
        const v = await this.dao.one(uvinReceived);
        return logAndRespond200(response, v, []);
      } else {
        const v = await this.dao.oneByUser(uvinReceived, username);
        return logAndRespond200(response, v, []);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(
          response,
          404,
          `There is no vehicle with the uvin received (uvin="${uvinReceived}")`
        );
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
  }

  async save(request: Request, response: Response, next: NextFunction) {
    // we check that the user is authorized
    const { username, role } = getPayloadFromResponse(response);
    try {
      const axiosResponse: any = await this.authServer.getUserByUsername(
        username
      );
      const user = axiosResponse["data"]["data"];
      if (!user.verified) {
        return logAndRespond400(response, 403, null);
      }
    } catch (error) {
      return logAndRespond500(response, 500, error);
    }

    try {
      try {
        // const dataReceived = JSON.parse(JSON.stringify(request.body));
        const dataReceived = request.body;

        // if the user is pilot, we check he is not passing the "authorized" parameter
        if (
          role === Role.PILOT &&
          Object.keys(dataReceived).includes("authorized")
        ) {
          throw new CustomError(
            'The received key "authorized" is not valid',
            null
          );
        }
        const isUpdate = dataReceived.uvin != undefined;
        if (isUpdate) {
          const uvin = dataReceived.uvin;
          delete dataReceived.uvin;
          await this.updateVehicle(request, response, next, uvin, dataReceived);
        } else {
          await this.addVehicle(request, response, next, dataReceived);
        }
      } catch (error) {
        if (error instanceof CustomError) {
          return logAndRespond400(response, 400, error.message);
        } else if (
          GeneralUtils.getErrorMessage(error).startsWith(
            "Multipart: Boundary not found"
          )
        ) {
          return logAndRespond400(
            response,
            400,
            "Multipart: Boundary not found"
          );
        } else {
          return logAndRespond500(response, 500, null);
        }
      }
    } catch (error) {
      return logAndRespond500(response, 500, error);
    }
  }

  /**
   * Change the status of user with username passed and status.token
   * @example {
   *  id: string
   * }
   * @param request
   * @param response
   * @param next
   */
  async authorizeVehicle(request: Request, response: Response) {
    const uvin = request.body.id || request.body.uvin;
    if (!isString(uvin)) {
      return logAndRespond400(response, 400, `Invalid uvin (uvin=${uvin})`);
    }
    const authorizedStatus = request.body.status;
    if (!isString(authorizedStatus)) {
      return logAndRespond400(
        response,
        400,
        `Invalid status (status=${authorizedStatus})`
      );
    }
    try {
      parseVehicleAuthorizeStatus(authorizedStatus);
    } catch (error) {
      return logAndRespond400(
        response,
        400,
        GeneralUtils.getErrorMessage(error)
      );
    }
    try {
      const { username, role } = getPayloadFromResponse(response);
      const vehicle = await this.dao.one(uvin);
      if (role !== Role.ADMIN && username !== vehicle.owner!.username) {
        return logAndRespond400(
          response,
          403,
          "You are not authorized to change vehicle status "
        );
      }
      if (
        role !== Role.ADMIN &&
        username === vehicle.owner!.username &&
        authorizedStatus === VehicleAuthorizeStatus.AUTHORIZED
      ) {
        return logAndRespond400(
          response,
          403,
          `You are not authorized to change vehicle status to ${authorizedStatus}`
        );
      }
      const vehicleToAuthorize: VehicleReg = new VehicleReg();
      vehicleToAuthorize.uvin = uvin;
      vehicleToAuthorize.authorized =
        parseVehicleAuthorizeStatus(authorizedStatus);
      const updatedVehicle = await this.dao.updateOnlyReceivedProperties(
        vehicleToAuthorize
      );
      this.mailAPI
        .sendMail(
          COMPANY_NAME!,
          [updatedVehicle.owner!.email],
          "Información sobre tu aeronave",
          generateAuthorizeVehicleMailText(updatedVehicle),
          generateAuthorizeVehicleMailHTML(updatedVehicle)
        )
        .catch(() => {
          console.error("Email was not send");
        });
      return logAndRespond200(response, updatedVehicle, []);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(
          response,
          404,
          `There is no vehicle with the uvin received (uvin=${uvin})`
        );
      }
      return logAndRespond500(response, 500, error);
    }
  }

  // -------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------
  // ------------------------------ PRIVATE FUNCTIONS ------------------------------
  // -------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------

  private async updateVehicle(
    request: Request,
    response: Response,
    next: NextFunction,
    uvin: string,
    dataReceived: any
  ) {
    const { role, username } = getPayloadFromResponse(response);

    // we create the VehicleReg to call the dao
    const vehicleToUpdate: VehicleReg = this.buildTypedVehicleReg(
      uvin,
      dataReceived
    );

    // if the user is pilot, we have to check that he is the owner of the vehicle, and also he is not trying to change this property
    if (role === Role.PILOT) {
      vehicleToUpdate.authorized = VehicleAuthorizeStatus.PENDING;
      if (vehicleToUpdate.owner) {
        throw new CustomError(
          `Pilot users can not update the owner of the vehicle (ownerReceived=${vehicleToUpdate.owner.username})`,
          null
        );
      } else {
        try {
          await this.dao.oneByUser(uvin, username);
        } catch (error) {
          if (error instanceof NotFoundError) {
            return logAndRespond400(
              response,
              400,
              `There is no vehicle with the uvin recieved (uvin="${uvin}")`
            );
          } else {
            return logAndRespond500(response, 500, error);
          }
        }
      }
    }

    // update the data
    try {
      const vehicleToUpdateProcesed =
        this.vehicleControllerExtension.preProcessUpdateVehicle(
          vehicleToUpdate
        );
      const updatedVehicle = await this.dao.updateOnlyReceivedProperties(
        vehicleToUpdateProcesed
      );
      this.vehicleControllerExtension.postVehicleUpdate(updatedVehicle);
      return logAndRespond200(response, updatedVehicle, []);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(
          response,
          400,
          `There is no vehicle with the uvin recieved (uvin="${uvin}")`
        );
      } else if (error instanceof InvalidDataError) {
        return logAndRespond400(response, 400, error.message);
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
  }

  private async addVehicle(
    request: Request,
    response: Response,
    next: NextFunction,
    dataReceived: any
  ) {
    const { role, username } = getPayloadFromResponse(response);

    // validate owner
    if (role === Role.PILOT) {
      if (dataReceived.owner_id) {
        throw new CustomError(
          `Pilot users can not pass the owner_id parameter, because the owner of the vehicle has to be the logged user. Remove the owner_id parameter (owner_id=${dataReceived.owner_id})`,
          null
        );
      } else {
        dataReceived.owner_id = username;
      }
    } else if (role === Role.ADMIN && !dataReceived.owner_id) {
      throw new CustomError(
        `The owner_id is a mandatory parameter (owner_id=${dataReceived.owner_id})`,
        null
      );
    }

    // we create the VehicleReg to call the dao
    const vehicleToAdd: VehicleReg = this.buildTypedVehicleReg(
      "",
      dataReceived
    );

    // when we add a new vehicle, we put the owner as operator by default
    if (
      vehicleToAdd.operators!.filter(
        (op) => op.username === vehicleToAdd.owner!.username
      ).length === 0
    ) {
      const ownerOperator = new User("", "", "", "", Role.PILOT);
      ownerOperator.username = vehicleToAdd.owner!.username;
      vehicleToAdd.operators!.push(ownerOperator);
    }

    // add the vehicle to the db
    try {
      const vehicleToAddProcessed =
        await this.vehicleControllerExtension.preProcessSaveVehicle(
          vehicleToAdd
        );
      const addedVehicle = await this.dao.add(vehicleToAddProcessed, username);
      this.vehicleControllerExtension.postVehicleCreation(addedVehicle);
      return logAndRespond200(response, addedVehicle, []);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(response, 400, error.message);
      } else if (error instanceof InvalidDataError) {
        return logAndRespond400(response, 400, error.message);
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
  }

  private buildTypedVehicleReg(uvin: string, vehicleData: any): VehicleReg {
    const vehicleDataKeys = Object.keys(vehicleData);
    const result: any = new VehicleReg();

    if (uvin) {
      result.uvin = uvin;
    }
    for (let i = 0; i < vehicleDataKeys.length; i++) {
      const key = vehicleDataKeys[i];
      result[key] = vehicleData[key];
      if (key === "owner_id") {
        result.owner = new User("", "", "", "", Role.PILOT);
        result.owner.username = vehicleData["owner_id"];
      } else if (key === "operators") {
        result.operators = this.parseOperators(vehicleData["operators"]);
      } else if (key === "extra_fields") {
        const extraFields: any =
          this.vehicleControllerExtension.validateVehicleExtraFields(
            vehicleData["extra_fields"]
          );
        if (extraFields) {
          result.extra_fields = extraFields;
        }
      } else if (key === "class") {
        try {
          parseVehicleType(vehicleData[key]);
        } catch (error) {
          throw new CustomError(
            `The received "class" is not valid (receivedClass="${vehicleData["class"]
            }", validClasses="${Object.keys(vehicleType)}")`,
            null
          );
        }
      } else if (key === "authorized") {
        try {
          parseVehicleAuthorizeStatus(vehicleData[key]);
        } catch (error) {
          throw new CustomError(
            `The received "authorized" is not valid (receivedAuthorized="${vehicleData["authorized"]
            }", validValues="${Object.keys(VehicleAuthorizeStatus)}")`,
            null
          );
        }
      } else if (!vehicleRegSchema[key]) {
        throw new CustomError(`The received key "${key}" is not valid`, null);
      }
    }
    if (!result.operators) result.operators = [];
    return result;
  }

  private parseOperators(jsonArrayOperators: string[]): User[] {
    const result: User[] = [];
    for (let i = 0; i < jsonArrayOperators.length; i++) {
      const opAux = jsonArrayOperators[i];
      const operator: User = new User("", "", "", "", Role.PILOT);
      operator.username = opAux;
      result.push(operator);
    }
    return result;
  }

  async addDocument(request: Request, response: Response) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const documentSchemas = require(VEHICLE_DOCUMENT_EXTRA_FIELDS_SCHEMA!);
    const { role, username } = getPayloadFromResponse(response);
    const dao = this.dao;
    const documentDao = this.documentDao;
    const upload = multipleFiles(undefined, undefined);
    const vehicleControllerExtension = this.vehicleControllerExtension;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    upload(request, response, async function (_err: unknown) {
      if (!Array.isArray(request.files)) {
        return logAndRespond400(response, 400, "No file received");
      }

      const vehicleUvinToAdd = request.params.uvin;
      let document: Document;
      try {
        const requestBody = request.body;
        requestBody["valid"] = false;
        requestBody["name"] = "";
        document = convertAnyToDocument(requestBody, documentSchemas);
        document.referenced_entity_id = vehicleUvinToAdd;
        document.referenced_entity_type = ReferencedEntityType.VEHICLE;
      } catch (error) {
        return logAndRespond400(response, 400, `${(error as Error).message}`);
      }
      try {
        setFileName(request, document);
        delete document.id;
        const doccc = document;
        const vehicle = await dao.one(vehicleUvinToAdd);
        if (role == Role.PILOT && !pilotCanEdit(username, vehicle)) {
          return logAndRespond400(
            response,
            401,
            `Pilot ${username} can't edit vehicle ${vehicleUvinToAdd}`
          );
        }
        await documentDao.save(doccc);
        if (!isObject(vehicle.extra_fields)) vehicle.extra_fields = {};
        if (!isArray(vehicle.extra_fields["documents"]))
          vehicle.extra_fields["documents"] = [];
        (vehicle.extra_fields as { documents: Array<any> }).documents.push(
          doccc
        );
        await dao.updateOnlyReceivedProperties(vehicle);
        vehicleControllerExtension.postProcessAddDocument(
          username,
          vehicle,
          doccc,
          GeneralUtils.getDownloadFileUrl(doccc.getFileName())
        );
        return logAndRespond200(response, vehicle, []);
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
    const documentDao = this.documentDao;
    const upload = multipleFiles(undefined, undefined);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    upload(request, response, async function (_err: unknown) {
      const uvinToUpdateDoc = request.params.uvin;
      const document = request.body;
      const documentId = document.id;
      try {
        setExtraField(document);
        setFileName(request, document);
        document.valid = false;
        const doc = getDocumentById(documentId);
        if (!doc) {
          return logAndRespond400(
            response,
            404,
            `Docuemnt ${documentId} not exists`
          );
        }
        const vehicle = await dao.one(uvinToUpdateDoc);
        if (role == Role.PILOT && !pilotCanEdit(username, vehicle)) {
          return logAndRespond400(
            response,
            401,
            `Pilot ${username} can't edit vehicle ${uvinToUpdateDoc}`
          );
        }
        const documents = (
          vehicle.extra_fields as { documents: Array<Document> }
        ).documents;
        const documentIndex = documents.findIndex(
          (document) => document.id === documentId
        );
        if (documentIndex >= 0) {
          const documentToUpdate = documents.splice(documentIndex, 1)[0];

          const newDocument: Document = {
            ...documentToUpdate,
            ...document,
            valid: false,
          };
          newDocument.referenced_entity_id = uvinToUpdateDoc;
          newDocument.referenced_entity_type = ReferencedEntityType.VEHICLE;

          if (
            newDocument.notifications &&
            typeof newDocument.notifications === "string"
          ) {
            try {
              newDocument.notifications = JSON.parse(newDocument.notifications);
            } catch (error) {
              throw new Error(
                `notifications must be a json (notifications=${newDocument.notifications})`
              );
            }
          }

          documents.push(newDocument);
          await documentDao.update(newDocument);
          (vehicle.extra_fields as { documents: Array<any> }).documents =
            documents;
          await dao.updateOnlyReceivedProperties(vehicle);
          return logAndRespond200(response, newDocument, []);
        } else {
          return logAndRespond400(
            response,
            404,
            `Vehice ${uvinToUpdateDoc} has not document ${documentId} `
          );
        }
      } catch (error) {
        return logAndRespond400(
          response,
          400,
          GeneralUtils.getErrorMessage(error)
        );
      }
    });
  }

  async deleteDocument(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    const uvinToRemoveDocument = request.params.uvin;
    const documentId = request.params.documentId;
    if (!isString(uvinToRemoveDocument))
      return logAndRespond400(response, 400, "uvin must be a string");
    if (!isString(documentId))
      return logAndRespond400(response, 400, "documentId must be a string");
    let vehicle: VehicleReg;
    try {
      vehicle = await this.dao.one(uvinToRemoveDocument);
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

    try {
      if (role == Role.PILOT && !pilotCanEdit(username, vehicle)) {
        return logAndRespond400(
          response,
          403,
          `Pilot ${username} can't edit vehicle ${uvinToRemoveDocument}`
        );
      }
      const vehicleExtraFields = vehicle.extra_fields;
      if (
        !isObject(vehicleExtraFields) ||
        !isArray(vehicleExtraFields["documents"])
      ) {
        return logAndRespond400(response, 404, "vehicle has no documents");
      }
      const vehicleDocuments = vehicleExtraFields["documents"];
      if (!vehicleDocuments.find((document) => document.id === documentId)) {
        return logAndRespond400(
          response,
          404,
          `Vehicle ${vehicle.vehicleName} hasn't document ${documentId}`
        );
      }
      vehicle.extra_fields["documents"] = vehicleDocuments.filter(
        (document) => document.id !== documentId
      );
      await this.dao.updateOnlyReceivedProperties(vehicle);
      return logAndRespond200(response, vehicle, []);
    } catch (error) {
      return logAndRespond500(response, 500, error);
    }
  }

  async getDocumentTags(request: Request, response: Response) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const documentSchemas = require(VEHICLE_DOCUMENT_EXTRA_FIELDS_SCHEMA!);
      const documentTags = Object.keys(documentSchemas);
      return logAndRespond200(response, documentTags, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  async getDocumentExtraFieldSchemas(request: Request, response: Response) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const documentSchemas = require(VEHICLE_DOCUMENT_EXTRA_FIELDS_SCHEMA!);
      return logAndRespond200(response, documentSchemas, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  async getDocumentExtraFieldSchemaByTag(request: Request, response: Response) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const documentSchemas = require(VEHICLE_DOCUMENT_EXTRA_FIELDS_SCHEMA!);
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
}
function pilotCanEdit(username: string, vehicle: VehicleReg) {
  return (
    username === vehicle.owner!.username ||
    vehicle.operators!.findIndex((user) => user.username === username) >= 0
  );
}
