/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextFunction, Request, Response } from "express";
import { OperationDao } from "../daos/operation.dao";
import { Role, User } from "../entities/user";
import { getPayloadFromResponse } from "../utils/auth.utils";
import { VehicleDao } from "../daos/vehicle.dao";
import {
  Operation,
  OperationState,
  parseOperationState,
} from "../entities/operation";
import {
  dateTimeStringFormat,
  validateStringDateIso,
} from "../utils/validation.utils";
import { UserDao } from "../daos/user.dao";
import { ApprovalDao } from "../daos/approval.dao";

import {
  sendNewOperation,
  sendOperationStateChange,
  sendUpdateOperation,
} from "../apis/socket-io/async-browser-comunication";
import { OperationVolume } from "../entities/operation-volume";
import {
  adminEmail,
  COMPANY_NAME,
  MOCK_MAIL_API,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_URL,
  SMTP_USERNAME,
} from "../utils/config.utils";
import { operationMailHtml } from "../utils/mail-content.utils";
import { VehicleReg } from "../entities/vehicle-reg";
import * as _ from "underscore";
import { PositionDao } from "../daos/position.dao";
import { generateFeatureFromExpress } from "../services/express-operation.service";
import { Geometry, Point, Polygon } from "geojson";
import { Severity } from "../entities/severety";
import { PriorityStatus } from "../entities/priority-elements";
import {
  CustomError,
  getPaginationParametersFromRequestQuery,
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
  logStateChange,
  removeNullProperties,
  validateObjectStructure,
  validateOperationVolume,
} from "./utils";

import { InvalidDataError, NotFoundError } from "../daos/db-errors";
import { RegularFlightDao } from "../daos/regular-flight.dao";
import { RegularFlight } from "../entities/regular-flight";
import IMailAPI from "../apis/mail/imail-api";
import MailAPIFactory from "../apis/mail/mail-api-factory";
import GeneralUtils from "../utils/general.utils";
// import { polygon, union } from 'turf';

const MIN_MIN_ALTITUDE = -300;
//const MAX_MIN_ALTITUDE = 0;

//const MIN_MAX_ALTITUDE = 0;
const MAX_MAX_ALTITUDE = 400;

// const MIN_TIME_INTERVAL = 15 * (1000 * 60); // 15 minutos
const MIN_TIME_INTERVAL = 1; // 1 segundo

export class OperationController {
  private dao = new OperationDao();
  private daoVehiculo = new VehicleDao();
  private daoPosition = new PositionDao();
  private daoUser = new UserDao();
  private daoRegularFlight = new RegularFlightDao();
  private mailAPI: IMailAPI = MailAPIFactory.getMailAPI(
    MOCK_MAIL_API,
    SMTP_URL!,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USERNAME!,
    SMTP_PASSWORD!
  );

  async activatedOperationByLocation(request: Request, response: Response) {
    const { role, username } = getPayloadFromResponse(response);
    const { onlyGufi } = request.query;
    const { location, altitude_gps } = request.body;
    try {
      const operation = await this.dao.getActivatedOperationByPosition(
        location,
        altitude_gps
      );
      // if the user is PILOT, we have to check that he es one of the operators of the operation
      if (role === Role.PILOT) {
        if (
          operation.uas_registrations!.filter(
            (vehicle) =>
              vehicle.operators!.filter(
                (operator) => operator.username === username
              ).length > 0
          ).length === 0
        ) {
          return logAndRespond400(
            response,
            404,
            `There is no operation ACTIVATED in the location received (location=${location}, altitude_gps=${altitude_gps})`
          );
        }
      }
      if (onlyGufi) {
        return logAndRespond200(response, { gufi: operation.gufi }, []);
      } else {
        return logAndRespond200(
          response,
          this.normalizeOperation(operation),
          []
        );
      }
    } catch (error) {
      if (error instanceof InvalidDataError) {
        return logAndRespond400(response, 400, error.message);
      } else if (error instanceof NotFoundError) {
        return logAndRespond400(
          response,
          404,
          `There is no operation ACTIVATED in the location received (location=${location}, altitude_gps=${altitude_gps})`
        );
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
  }

  /**
   * Return all operations, if state passed return all operations with this state
   * query params: state=OperationState
   * @example /operations/?state=PROPOSED
   * @param request
   * @param response
   * @param next
   */
  //solo admin y monitor
  async all(request: Request, response: Response, next: NextFunction) {
    try {
      await this.returnOperations(request, response, next, false);
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Return all operations without sensible data, if state passed return all operations with this state
   * query params: state=OperationState
   * @example /operations/?state=PROPOSED
   * @param request
   * @param response
   * @param next
   */
  //Endpoint publico
  async getPublicOperations(request: Request, response: Response) {
    let ops: Operation[];
    const keysToKeepOper = [
      "gufi",
      "state",
      "operation_volumes",
      "uas_registrations",
    ];
    const keysToKeepUas = ["faaNumber", "uvin", "extra_fields"];
    try {
      const setAllAux = (obj: any, val: any, keysToKeep: any) =>
        Object.keys(obj).forEach((k) => {
          if (_.contains(keysToKeep, k)) {
            //do nothing TODO
          } else {
            obj[k] = val;
          }
        });
      const setAll = (obj: any, value: any, keysToKeep: any) =>
        setAllAux(obj, value, keysToKeep);
      const sensibleOps = (await this.dao.all())[0];
      ops = [];
      sensibleOps.forEach((element) => {
        setAll(element, null, keysToKeepOper);
        element.uas_registrations!.forEach((uas) => {
          setAll(uas, null, keysToKeepUas);
          uas.operators = [];
          if (uas.extra_fields)
            setAll(uas.extra_fields, null, [
              "caa_registration",
              "id",
              "authorized",
            ]);
        });
        ops.push(element);
      });
      return logAndRespond200(response, { count: ops.length, ops }, []);
    } catch (error) {
      console.error(` -_-_-_-_-_-_-_-> ${JSON.stringify(error)}`);
      return logAndRespond400(response, 400, null);
    }
  }

  async getOnePublicOperation(request: Request, response: Response) {
    const keysToKeep = ["gufi", "state", "operation_volumes"];
    try {
      const setAllSensible = (obj: any, val: any) =>
        Object.keys(obj).forEach((k) => {
          if (_.contains(keysToKeep, k)) {
            //do nothing TODO
          } else {
            obj[k] = val;
          }
        });
      const setNull = (obj: any) => setAllSensible(obj, null);
      const sensibleOp = await this.dao.one(request.params.id);
      setNull(sensibleOp);

      return logAndRespond200(response, sensibleOp, []);
    } catch (error) {
      console.error(` -_-_-_-_-_-_-_-> ${JSON.stringify(error)}`);
      return logAndRespond400(response, 400, null);
    }
  }

  /**
   * Return an operation associated with passed gufi and that login user is owner.
   *  If user is not the owner or is not admin or monitor return 404.
   * @example /operation/b92c7431-13c4-4c6c-9b4a-1c3c8eec8c63
   * @param request
   * @param response
   * @param next
   */
  async one(request: Request, response: Response) {
    // console.log(` ---> request.params.gufi:${request.params.id}`)
    try {
      const { role, username } = getPayloadFromResponse(response);
      if (role == Role.ADMIN || role == Role.MONITOR) {
        const operation = this.normalizeOperation(
          await this.dao.one(request.params.id)
        );
        return logAndRespond200(response, operation, []);
      } else {
        const v = await this.dao.oneByOwner(request.params.id, username);
        return logAndRespond200(response, v, []);
      }
    } catch (error) {
      return logAndRespond400(response, 404, null);
    }
  }

  /**
   * Save the passed operation. If a vehicle is passed that vehicle must be created by the login user
   * @example
   * {
   *   "flight_comments": "Test operation for rescue",
   *   "volumes_description": "Simple polygon",
   *   "faa_rule": "PART_107",
   *   "priority_elements": {
   *     "priority_level": "ALERT",
   *     "priority_status": "NONE"
   *   },
   *   "contact": "Renate Penvarden",
   *   "contingency_plans": [
   *     {
   *       "contingency_cause": [
   *         "ENVIRONMENTAL",
   *         "MECHANICAL_PROBLEM"
   *       ],
   *       "contingency_location_description": "OPERATOR_UPDATED",
   *       "contingency_polygon": {"type": "Polygon","coordinates": [[[-56.16361141204833,-34.90682134107926],[-56.163225173950195,-34.911255687582056],[-56.15453481674194,-34.91389506584019],[-56.15406274795532,-34.909020947652444],[-56.16361141204833,-34.90682134107926]]]},
   *       "contingency_response": "LANDING",
   *       "free_text": "Texto libre DE prueba",
   *       "loiter_altitude": 30,
   *       "relative_preference": 30,
   *       "relevant_operation_volumes": [
   *         1,
   *         0
   *       ],
   *       "valid_time_begin": "2019-12-11T19:59:10Z",
   *       "valid_time_end": "2019-12-11T20:59:10Z"
   *     }
   *   ],
   *   "operation_volumes": [
   *     {
   *       "effective_time_begin": "2019-12-11T19:59:10Z",
   *       "effective_time_end": "2019-12-11T20:59:10Z",
   *       "min_altitude": 0,
   *       "max_altitude": 70,
   *       "operation_geography": {"type": "Polygon","coordinates": [[[-56.16361141204833,-34.90682134107926],[-56.163225173950195,-34.911255687582056],[-56.15453481674194,-34.91389506584019],[-56.15406274795532,-34.909020947652444],[-56.16361141204833,-34.90682134107926]]]},
   *       "beyond_visual_line_of_sight": true
   *     }
   *   ],
   *   "negotiation_agreements": [
   *     {
   *       "free_text": "Esto es solo una prueba",
   *       "discovery_reference": "discovery reference",
   *       "type": "INTERSECTION",
   *       "uss_name": "dronfies",
   *       "uss_name_of_originator": "dronfies",
   *       "uss_name_of_receiver": "dronfies"
   *     },
   *     {
   *       "free_text": "(2) Esto es solo una prueba",
   *       "discovery_reference": "(2)discovery reference",
   *       "type": "REPLAN",
   *       "uss_name": "dronfies",
   *       "uss_name_of_originator": "dronfies",
   *       "uss_name_of_receiver": "dronfies"
   *     }
   *   ]
   * }
   * @param request
   * @param response
   * @param next
   */
  async save(request: Request, response: Response) {
    const { role, username } = response.locals.jwtPayload;
    const usernameFromRequest = username;

    // if the user is PILOT and the owner parameter was received, we check that owner is the logged user
    if (
      role === Role.PILOT &&
      Object.keys(request.body).includes("owner") &&
      request.body.owner !== username
    ) {
      return logAndRespond400(
        response,
        400,
        "Pilot users must be the owners of the operations they create. Set you as the owner of the operation or remove the owner key from the operation object."
      );
    }

    request.body.owner = request.body.owner || usernameFromRequest;
    const isCreating = request.body.gufi == undefined;
    const errors = validateOperation(request.body, !isCreating);
    const usernameOwner = request.body.owner;

    // validate that the usernameOwner exists
    try {
      await new UserDao().one(usernameOwner);
    } catch (err) {
      errors.push(`There is no user with the username '${usernameOwner}'.`);
    }

    try {
      for (
        let index = 0;
        index < request.body.uas_registrations.length;
        index++
      ) {
        const uas_id = request.body.uas_registrations[index];
        const veh = await this.daoVehiculo.one(uas_id);
        const isOwner = veh.owner!.username == username;
        if (role != Role.ADMIN && !isOwner) {
          const isOperator = veh.operators!.reduce((prev, user) => {
            return prev || user.username == username;
          }, false);
          if (!isOperator) {
            errors.push(`You do not have permits for vehicle ${uas_id}.`);
          }
        }
        request.body.uas_registrations[index] = veh;
      }
    } catch (error) {
      errors.push(`The selected vehicle doesn't exists.`);
    }
    let operationToSave: any;
    let previousState = "UNKNOWN";
    if (isCreating) {
      request.body.creator = { username: usernameFromRequest };
      request.body.state = OperationState.PROPOSED;
      operationToSave = { ...request.body };
    } else {
      if (request.body.gufi == undefined) {
        errors.push("The selected operation doesn't exists.");
      } else {
        const savedOperation = <Operation>await this.dao.one(request.body.gufi);
        previousState = savedOperation.state;
        operationToSave = { ...savedOperation, ...request.body };
      }
    }

    if (errors.length == 0) {
      try {
        const operation = await this.dao.save(operationToSave);

        if (isCreating) {
          //If im creating the the new state is proposed
          sendNewOperation({
            gufi: operation.gufi,
            name: operation.name,
            state: operation.state,
            owner: operation.owner,
          });
          this.mailAPI.sendMail(
            COMPANY_NAME!,
            adminEmail,
            "Creacion de operación " + operation.name,
            operationMailHtml(operation),
            operationMailHtml(operation)
          );
        } else {
          if (operation.state !== previousState) {
            logStateChange(
              operation.gufi,
              operation.state,
              previousState,
              `${username} updated the operation`
            );
            this.mailAPI.sendMail(
              COMPANY_NAME!,
              adminEmail,
              "Actualización de operación de " + operation.owner.username,
              operationMailHtml(operation),
              operationMailHtml(operation)
            );
          }
          sendUpdateOperation({
            gufi: operation.gufi,
            name: operation.name,
            state: operation.state,
            owner: operation.owner,
            previousState: previousState,
          });
        }
        return logAndRespond200(response, operation, []);
      } catch (error) {
        console.log(error);
        return logAndRespond400(response, 400, null);
      }
    } else {
      return logAndRespond400(response, 400, errors.join(". "));
    }
  }

  async createOperationFromRegularFlight(request: Request, response: Response) {
    const { role, username } = response.locals.jwtPayload;
    const errors = [];
    try {
      const {
        effective_time_begin,
        regular_flight_id,
        name,
        owner,
        contact,
        contact_phone,
        uas_registrations,
      } = request.body;
      let ownerUser: any;
      let creator: any;
      // validate that the usernameOwner exists
      try {
        ownerUser = await new UserDao().one(owner);
      } catch (err) {
        errors.push(`There is no user with the username '${owner}'.`);
      }
      try {
        creator = await new UserDao().one(username);
      } catch (err) {
        errors.push(`There is no user with the username '${username}'.`);
      }
      const vehicles: VehicleReg[] = [];
      try {
        for (let index = 0; index < uas_registrations.length; index++) {
          const uas_id = uas_registrations[index];
          const veh = await this.daoVehiculo.one(uas_id);
          const isOwner = veh.owner!.username == username;
          if (role != Role.ADMIN && !isOwner) {
            const isOperator = veh.operators!.reduce((prev, user) => {
              return prev || user.username == username;
            }, false);
            if (!isOperator) {
              errors.push(`You do not have permits for vehicle ${uas_id}.`);
            }
          }
          vehicles.push(veh);
        }
      } catch (error) {
        errors.push("The selected vehicle doesn't exists.");
      }
      let regularFlight: RegularFlight;
      try {
        regularFlight = await this.daoRegularFlight.one(regular_flight_id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return logAndRespond400(response, 404, error.message);
        } else {
          return logAndRespond500(response, 500, error);
        }
      }

      const operation = await this.dao.createOperationFromRegularFlight(
        regularFlight,
        effective_time_begin,
        ownerUser,
        contact,
        contact_phone,
        vehicles,
        creator,
        name
      );
      sendNewOperation({
        gufi: operation.gufi,
        name: operation.name,
        state: operation.state,
        owner: operation.owner,
      });
      this.mailAPI.sendMail(
        COMPANY_NAME!,
        adminEmail,
        "Creacion de operación " + operation.name,
        operationMailHtml(operation),
        operationMailHtml(operation)
      );
      return logAndRespond200(response, operation, []);
    } catch (error) {
      return logAndRespond400(
        response,
        400,
        GeneralUtils.getErrorMessage(error)
      );
    }
  }

  async acpetPendingOperation(request: Request, response: Response) {
    const gufi = request.params.id;
    const comments = request.body.comments;
    const approved = request.body.approved;

    console.log(`Gufi::${gufi}, ->${JSON.stringify(request.body)}`);
    try {
      const { role, username } = getPayloadFromResponse(response);

      if (role == Role.ADMIN) {
        const newState = approved
          ? OperationState.ACCEPTED
          : OperationState.CLOSED;
        // let result = await this.dao.updateStateWhereState(gufi, OperationState.PENDING, OperationState.ACCEPTED);
        const result = await this.dao.updateStateWhereState(
          gufi,
          OperationState.PENDING,
          newState,
          `${username} changed state to ${newState}`
        );

        const operation = await this.dao.one(gufi);

        this.mailAPI.sendMail(
          COMPANY_NAME!,
          adminEmail,
          "Cambio de estado de operacion " + operation.name,
          operationMailHtml(operation),
          operationMailHtml(operation)
        );
        if (operation.owner && operation.owner.email) {
          this.mailAPI.sendMail(
            COMPANY_NAME!,
            [operation.owner.email],
            "Cambio de estado de operacion " + operation.name,
            operationMailHtml(operation),
            operationMailHtml(operation)
          );
        }
        sendUpdateOperation({
          gufi: operation.gufi,
          name: operation.name,
          state: operation.state,
          owner: operation.owner,
          previousState: OperationState.PENDING,
        });

        // console.log(`** Result of update:: ${JSON.stringify(result)}:: (result.affected)=${result.affected} && (result.affected == 1)=${result.affected == 1}`)
        if (result.affected && result.affected == 1) {
          const approval = await this.addNewAproval(
            username,
            gufi,
            comments,
            approved
          );
          return logAndRespond200(response, approval, []);
        } else {
          return logAndRespond400(response, 404, null);
        }
      } else {
        return logAndRespond400(response, 401, null);
      }
    } catch (error) {
      return logAndRespond400(response, 404, null);
    }
  }

  async updateState(request: Request, response: Response) {
    const gufi = request.params.id;
    if (!request.body || !request.body.state) {
      return logAndRespond400(
        response,
        400,
        'Invalid request (expected: {"state": "..."})'
      );
    }
    let strNewState = "";
    try {
      strNewState = request.body.state.toUpperCase().trim();
    } catch (err) {
      return logAndRespond400(response, 400, null);
    }
    let newState: OperationState;
    try {
      newState = parseOperationState(strNewState);
    } catch (error) {
      return logAndRespond400(
        response,
        400,
        GeneralUtils.getErrorMessage(error)
      );
    }

    console.log(`Gufi::${gufi}, ->${JSON.stringify(request.body)}`);

    try {
      const { role } = getPayloadFromResponse(response);

      if (role == Role.ADMIN) {
        // let result = await this.dao.updateStateWhereState(gufi, OperationState.PENDING, OperationState.ACCEPTED);
        const operation = await this.dao.one(gufi);
        const result = await this.dao.updateState(
          gufi,
          newState,
          operation.state,
          ""
        );

        this.mailAPI.sendMail(
          COMPANY_NAME!,
          adminEmail,
          "Cambio de estado de operacion " + operation.name,
          operationMailHtml(operation),
          operationMailHtml(operation)
        );
        sendOperationStateChange(
          operation.gufi,
          newState,
          "Operation state was changed manually by ADMIN user"
        );
        sendUpdateOperation({
          gufi: operation.gufi,
          name: operation.name,
          state: newState,
          previousState: operation.state,
          owner: operation.owner,
        });
        if (operation.owner && operation.owner.email) {
          this.mailAPI.sendMail(
            COMPANY_NAME!,
            [operation.owner.email],
            "Cambio de estado de operacion " + operation.name,
            operationMailHtml(operation),
            operationMailHtml(operation)
          );
        }
        return logAndRespond200(response, result, []);
      } else {
        return logAndRespond400(response, 401, null);
      }
    } catch (error) {
      return logAndRespond400(response, 404, null);
    }
  }

  async closeOwnOperation(request: Request, response: Response) {
    const gufi = request.params.id;

    const newState = OperationState.CLOSED;
    try {
      const { username } = getPayloadFromResponse(response);
      const operation = await this.dao.one(gufi);
      if (operation.owner === null || operation.owner === undefined) {
        return logAndRespond400(response, 400, "The operation has no owner");
      }
      if (operation.state === OperationState.CLOSED) {
        return logAndRespond400(
          response,
          400,
          "The operation is already closed"
        );
      }
      if (operation.owner.username === username) {
        // let result = await this.dao.updateStateWhereState(gufi, OperationState.PENDING, OperationState.ACCEPTED);
        const oldState = operation.state;
        await this.dao.updateState(
          gufi,
          newState,
          oldState,
          `${username} closed operation`
        );

        const operationInfo = {
          gufi: operation.gufi,
          state: newState,
        };
        this.mailAPI.sendMail(
          COMPANY_NAME!,
          adminEmail,
          "Cambio de estado de operacion " + operation.name,
          operationMailHtml(operation),
          operationMailHtml(operation)
        );
        sendUpdateOperation({
          gufi: operation.gufi,
          name: operation.name,
          state: operation.state,
          previousState: oldState,
          owner: operation.owner,
        });
        if (operation.owner && operation.owner.email) {
          this.mailAPI.sendMail(
            COMPANY_NAME!,
            [operation.owner.email],
            "Cambio de estado de operacion " + operation.name,
            operationMailHtml(operation),
            operationMailHtml(operation)
          );
        }
        return logAndRespond200(response, operationInfo, []);
      } else {
        return logAndRespond400(response, 401, "The operation is not yours");
      }
    } catch (error) {
      return logAndRespond400(response, 404, null);
    }
  }

  private async addNewAproval(
    username: any,
    operationGufi: any,
    comments: any,
    approved: any
  ) {
    const appr = {
      user: { username },
      operation: { gufi: operationGufi },
      approved: approved,
      comments: comments,
    };
    const approvalDao = new ApprovalDao();
    const result = await approvalDao.save(appr);
    return Object.assign(appr, result.raw[0]);
  }

  async getOperationByPoint(request: Request, response: Response) {
    try {
      const expectedRequestBodyStructure = {
        longitude: 0,
        latitude: 0,
        altitude: 0,
      };
      if (
        !validateObjectStructure(request.body, expectedRequestBodyStructure)
      ) {
        throw new CustomError(
          `Invalid json received (expected json ${JSON.stringify(
            expectedRequestBodyStructure
          )})`,
          null
        );
      }
      const { longitude, latitude, altitude } = request.body;
      this.validateCoordinates(longitude, latitude, altitude);

      const receivedPoint: Point = {
        type: "Point",
        coordinates: [longitude, latitude, altitude],
      };
      const operation = await this.dao.getOperationByPoint(receivedPoint);
      return logAndRespond200(response, operation, []);
    } catch (error) {
      if (error instanceof CustomError || error instanceof InvalidDataError) {
        return logAndRespond400(response, 400, error.message);
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
  }

  async getOperationByVolumeOperation(request: Request, response: Response) {
    try {
      validateOperationVolume(request.body);
      const operations = await this.dao.getOperationByVolume(
        new Date(request.body.effective_time_begin),
        new Date(request.body.effective_time_end),
        request.body.min_altitude,
        request.body.max_altitude,
        request.body.operation_geography
      );
      return logAndRespond200(response, operations, []);
    } catch (error) {
      if (error instanceof CustomError || error instanceof InvalidDataError) {
        return logAndRespond400(response, 400, error.message);
      } else {
        console.log(error);
        return logAndRespond500(response, 500, error);
      }
    }
  }

  /**
   * Return an operation associated with passed gufi and that login user is owner.
   * @param request
   * @param response
   * @param next
   */
  async operationsByCreator(request: Request, response: Response) {
    const { username } = response.locals.jwtPayload;
    // let state = request.query.state

    const { limit, offset } = this.parseLimitAndOffset(request.query);
    const ops = await this.dao.operationsByCreator(username, limit, offset);
    return logAndRespond200(response, { count: ops.length, ops }, []);
  }

  private parseLimitAndOffset(requestQuery: {
    limit?: string;
    offset?: string;
  }): {
    limit?: number;
    offset?: number;
  } {
    let limit = undefined;
    try {
      limit = requestQuery.limit ? Number(requestQuery.limit) : undefined;
    } catch (error) {
      limit = undefined;
    }
    let offset = undefined;
    try {
      offset = requestQuery.offset ? Number(requestQuery.offset) : undefined;
    } catch (error) {
      offset = undefined;
    }
    return { limit, offset };
  }

  /**
   * Returns Operations owned by current user
   * @param request
   * @param response
   * @param next
   */
  async operationsByOwner(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    await this.returnOperations(request, response, next, true);
  }

  /**
   * Remove an operation by gufi. If user is PILOT and is not the owner return 404
   * DELETE /operation/b92c7431-13c4-4c6c-9b4a-1c3c8eec8c63
   * @param request
   * @param response
   * @param next
   */
  async remove(request: Request, response: Response) {
    const operationGufi = request.params.id;
    try {
      const { role, username } = getPayloadFromResponse(response);
      let opToRemove;
      if (role == Role.ADMIN) {
        opToRemove = await this.dao.one(operationGufi);
      } else {
        opToRemove = await this.dao.oneByCreator(operationGufi, username);
      }

      if (await this.daoPosition.existsPositionForOperation(operationGufi)) {
        return logAndRespond400(
          response,
          400,
          `The operation can't be removed, because there is at least one position report associated to it [gufi=${operationGufi}]`
        );
      }

      // console.log(`Will remove the operation ${opToRemove.gufi}`)
      const removedOperation = await this.dao.removeOperation(opToRemove);
      // console.log(`Removed the operation ${removedOperation.gufi}`)
      return logAndRespond200(response, removedOperation, []);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return logAndRespond400(response, 404, error.message);
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
  }
  /**
   * Creates an Express Operation given a center point , radius in kilometers and duration in hours,
   * also jwt and a vehicle id is needed
   * POST /operation/express
   * @param request
   * @param response
   * @param next
   */
  async expressOperation(request: Request, response: Response) {
    const center = request.body.location;
    const radius: number = request.body.radius;
    const duration: number = request.body.duration;
    const vehicleId: string = request.body.vehicleId;
    const phone: string = request.body.phone;
    const { role, username } = response.locals.jwtPayload;
    const errors = [];
    let vehicle: VehicleReg;

    //validate all body parameters
    if (!center) {
      errors.push("location is required");
    }
    if (!radius) {
      errors.push("radius is required");
    }
    if (!duration) {
      errors.push("duration is required");
    }
    if (!vehicleId) {
      errors.push("vehicleId is required");
    }
    if (!phone) {
      errors.push("phone is required");
    }

    // * CHECK FOR VEHICLE VALIDITY //

    try {
      vehicle = await this.daoVehiculo.one(vehicleId);
      const isOwner = vehicle.owner!.username == username;
      if (role != Role.ADMIN && !isOwner) {
        const isOperator = vehicle.operators!.reduce((prev, user) => {
          return prev || user.username == username;
        }, false);
        if (!isOperator) {
          errors.push(`You do not have permits for vehicle ${vehicleId}.`);
        }
      }
    } catch (error) {
      errors.push("The selected vehicle doesn't exists.");
    }

    // * BUILD THE OPERATION VOLUME //

    const polygon: any = generateFeatureFromExpress(center, radius);

    // * BUILD THE REST OF THE OPERATION //

    const ownerFromUsername: User = await this.daoUser.one(username);

    const operation: Operation = {
      gufi: "",
      name: "Express Operation",
      owner: ownerFromUsername,
      flight_comments: "",
      contact: ownerFromUsername.firstName + " " + ownerFromUsername.lastName,
      contact_phone: phone,
      state: OperationState.PROPOSED,
      controller_location: undefined,
      operation_volumes: [],
      uas_registrations: [vehicle!],
      creator: ownerFromUsername,
      contingency_plans: [],
      priority_elements: {
        priority_level: Severity.NOTICE,
        priority_status: PriorityStatus.NONE,
      },
    };

    //Set the beggining and ending dates
    const newDate = new Date();
    const newEndingDate = new Date(newDate);
    newEndingDate.setHours(newDate.getHours() + duration);

    // ! this has to be tested
    const operVol: OperationVolume = {
      ordinal: 1,
      near_structure: true,
      effective_time_begin: newDate.toISOString(),
      effective_time_end: newEndingDate.toISOString(),
      min_altitude: 0,
      max_altitude: 120,
      beyond_visual_line_of_sight: true,
      operation_geography: polygon as Polygon,
    };
    //Lets push volume into operation
    operation.operation_volumes.push(operVol);

    //Try to validate the operation created
    errors.concat(validateOperation(operation));

    if (errors.length == 0) {
      try {
        <Operation>await this.dao.save(operation);
        sendNewOperation({
          gufi: operation.gufi,
          name: operation.name,
          state: operation.state,
          owner: operation.owner,
        });
        return logAndRespond200(response, operation, []);
      } catch (error) {
        return logAndRespond400(response, 400, null);
      }
    } else {
      return logAndRespond400(response, 400, null);
    }
  }

  private validateCoordinates = (
    longitude: any,
    latitude: any,
    altitude: any
  ) => {
    this.validateCoordinate(longitude, "longitude", -180, 180);
    this.validateCoordinate(latitude, "latitude", -180, 180);
    this.validateCoordinate(altitude, "altitude", -99999, 99999);
  };

  private validateCoordinate(
    coordinate: unknown,
    coordinateName: string,
    min: number,
    max: number
  ) {
    const numberCoordinate = Number(coordinate);
    if (Number.isNaN(numberCoordinate)) {
      throw new CustomError(
        `${coordinateName} is not a number (${coordinateName}=${coordinate})`,
        null
      );
    }
    if (numberCoordinate < min || numberCoordinate > max) {
      throw new CustomError(
        `${coordinateName} must be between ${min} and ${max} (${coordinateName}=${coordinate})`,
        null
      );
    }
  }

  private validateStates = (
    states:
      | string
      | string[] /* | QueryString.ParsedQs | QueryString.ParsedQs[] */
  ) => {
    if (!states || states.length === 0) {
      throw new CustomError(
        `"states" can't be null, undefined or empty [states=${states}]`,
        null
      );
    }
    const opStates: OperationState[] = [];
    for (let i = 0; i < states.length; i++) {
      let opState: OperationState;
      try {
        opState = parseOperationState(states[i]);
      } catch (error) {
        throw new CustomError(
          `The received state is not valid (state=${states[i]})`,
          null
        );
      }
      // we check states are not repeated
      if (opStates.includes(opState)) {
        throw new CustomError(
          `You can not repeat states (repeatedState=${states[i]})`,
          null
        );
      }
      opStates.push(opState);
    }
  };

  private normalizeOperation = (operation: unknown) => {
    const result = removeNullProperties(operation, false);
    if (result["owner"]) {
      result["owner"] = this.normalizeUser(result["owner"]);
    }
    if (result["creator"]) {
      result["creator"] = this.normalizeUser(result["creator"]);
    }
    if (
      result["operation_volumes"] &&
      Array.isArray(result["operation_volumes"])
    ) {
      result["operation_volumes"] = result["operation_volumes"].map((vol) =>
        removeNullProperties(vol, true)
      );
    }
    if (
      result["uas_registrations"] &&
      Array.isArray(result["uas_registrations"])
    ) {
      const normalizedVehicles = [];
      for (let i = 0; i < result["uas_registrations"].length; i++) {
        const vehicle = removeNullProperties(
          result["uas_registrations"][i],
          true
        );
        if (vehicle["registeredBy"])
          vehicle["registeredBy"] = this.normalizeUser(vehicle["registeredBy"]);
        if (vehicle["owner"])
          vehicle["owner"] = this.normalizeUser(vehicle["owner"]);
        if (vehicle["operators"] && Array.isArray(vehicle["operators"])) {
          const normalizedOperators = [];
          for (let j = 0; j < vehicle["operators"].length; j++) {
            normalizedOperators.push(
              this.normalizeUser(vehicle["operators"][j])
            );
          }
          vehicle["operators"] = normalizedOperators;
        }
        normalizedVehicles.push(vehicle);
      }
      result["uas_registrations"] = normalizedVehicles;
    }
    return result;
  };

  private normalizeUser = (user: unknown) => {
    const result = removeNullProperties(user, true);
    delete result["role"];
    delete result["VolumesOfInterest"];
    delete result["deletedAt"];
    delete result["settings"];
    return result;
  };

  private returnOperations = async (
    request: Request,
    response: Response,
    next: NextFunction,
    filterByOwner: boolean
  ) => {
    const { username, role } = getPayloadFromResponse(response);
    let ops;
    if (filterByOwner || role == Role.ADMIN || role == Role.MONITOR) {
      try {
        let { states } = request.query;
        const { fromDate, toDate } = request.query;
        const { take, skip, filterBy, filter, orderBy, order } =
          getPaginationParametersFromRequestQuery(request.query);
        try {
          if (states) {
            if (typeof states === "string") {
              states = JSON.parse(states);
            }
          } else {
            states = Object.keys(OperationState);
          }
        } catch (error) {
          throw new CustomError(
            `Invalid "states" received (states="${states}")`,
            null
          );
        }
        states = states as string[];
        this.validateStates(states);
        let timeRange: any = null;

        // TODO It would be nice to let the user to pass only one of this two parameters
        if ((fromDate && !toDate) || (toDate && !fromDate)) {
          return logAndRespond400(
            response,
            400,
            `If you pass "fromDate" you have to pass "toDate" and vice versa (fromDate=${fromDate}, toDate=${toDate})`
          );
        }
        if (fromDate != undefined && toDate != undefined) {
          if (!validateStringDateIso(fromDate as string)) {
            return logAndRespond400(
              response,
              400,
              `Invalid date format (toDate=${fromDate})`
            );
          }
          if (!validateStringDateIso(toDate as string)) {
            return logAndRespond400(
              response,
              400,
              `Invalid date format (toDate=${toDate})`
            );
          }
          timeRange = {
            start: new Date(fromDate as string),
            end: new Date(toDate as string),
          };
        }
        let count = 0;
        const owner = filterByOwner ? username : null;
        const [_ops, _count] = await this.dao.all(
          states,
          orderBy,
          order,
          take,
          skip,
          filterBy,
          filter,
          timeRange,
          owner
        );
        ops = _ops.map((op) => this.normalizeOperation(op));
        count = _count;
        return logAndRespond200(response, { count, ops }, []);
      } catch (error) {
        if (error instanceof InvalidDataError || error instanceof CustomError) {
          return logAndRespond400(response, 400, error.message);
        } else {
          return logAndRespond500(response, 500, error);
        }
      }
    } else {
      return logAndRespond400(response, 403, null);
    }
  };
  async activatedOperationByLocationForMQTT(username: any, position: any) {
    const { location, altitude } = position;
    try {
      const operation = await this.dao.getActivatedOperationByPosition(
        location,
        altitude
      );
      // if the user is PILOT, we have to check that he es one of the operators of the operation
      if (
        operation.uas_registrations!.filter(
          (vehicle) =>
            vehicle.operators!.filter(
              (operator) => operator.username === username
            ).length > 0
        ).length === 0
      ) {
        return {
          status: "error",
          message: `There is no operation ACTIVATED in the location received (location=${JSON.stringify(
            location
          )}, altitude_gps=${altitude})`,
        };
      }
      return { status: "ok", gufi: operation.gufi };
    } catch (error) {
      if (error instanceof InvalidDataError) {
        return { status: "error", message: error.message };
      } else if (error instanceof NotFoundError) {
        return {
          status: "error",
          message: `There is no operation ACTIVATED in the location received (location=${JSON.stringify(
            location
          )}, altitude_gps=${altitude})`,
        };
      } else {
        return {
          status: "error",
          message: GeneralUtils.getErrorMessage(error),
        };
      }
    }
  }
}

function validateOperation(operation: any, checkVolumesHaveId?: boolean) {
  const errors = [];
  // let op: Operation = operation
  const op = operation;
  if (!op["name"]) {
    errors.push("name is a mandatory field");
  }
  if (!op["owner"]) {
    errors.push("owner is a mandatory field");
  }
  if (
    op["operation_volumes"] == undefined ||
    op["operation_volumes"].length === 0
  ) {
    errors.push("Operation must have at least 1 volume and has none");
  } else {
    for (let index = 0; index < op["operation_volumes"].length; index++) {
      const element = op["operation_volumes"][index];
      try {
        validateOperationVolume(element, checkVolumesHaveId);
      } catch (error) {
        errors.push(
          `Invalid operation volume (${GeneralUtils.getErrorMessage(error)})`
        );
        continue;
      }

      const firstVertex = element.operation_geography.coordinates[0][0];
      const lastVertex =
        element.operation_geography.coordinates[0][
          element.operation_geography.coordinates[0].length - 1
        ];
      if (
        firstVertex[0] !== lastVertex[0] ||
        firstVertex[1] !== lastVertex[1]
      ) {
        errors.push("Invalid polygon");
      }
      if (!(element.min_altitude >= MIN_MIN_ALTITUDE)) {
        errors.push(
          `Min altitude must be greater than ${MIN_MIN_ALTITUDE} and is ${element.min_altitude}`
        );
      }
      if (!(element.max_altitude <= MAX_MAX_ALTITUDE)) {
        errors.push(
          `Max altitude must be lower than ${MAX_MAX_ALTITUDE} and is ${element.max_altitude}`
        );
      }
      const effectiveTimeBeginValid = validateStringDateIso(
        element.effective_time_begin
      );
      if (!effectiveTimeBeginValid) {
        errors.push(
          `effective_time_begin ${element.effective_time_begin} must have the format ${dateTimeStringFormat}`
        );
      }
      const effectiveTimeEndValid = validateStringDateIso(
        element.effective_time_end
      );
      if (!effectiveTimeEndValid) {
        errors.push(
          `effective_time_end ${element.effective_time_end} must have the format ${dateTimeStringFormat}`
        );
      }
      const effective_time_begin = new Date(element.effective_time_begin);
      const effective_time_end = new Date(element.effective_time_end);
      const difference =
        effective_time_end.getTime() - effective_time_begin.getTime();
      if (difference <= 0) {
        errors.push(
          `effective_time_begin ${element.effective_time_begin} must be lower than effective_time_end ${element.effective_time_end}`
        );
      } else if (difference < MIN_TIME_INTERVAL) {
        errors.push(
          `The time interval must be greater than ${
            MIN_TIME_INTERVAL / 60 / 1000
          } min and is ${difference / 60 / 1000} min`
        );
      }
    }
  }
  return errors;
}
