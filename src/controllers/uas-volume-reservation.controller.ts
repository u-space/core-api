/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { UASVolumeReservationDao } from "../daos/uas-volume-reservation.dao";
import { UASVolumeReservation, UASVolumeReservationType } from "../entities/uas-volume-reservation";
import { OperationDao } from "../daos/operation.dao";
import { Operation, OperationState } from "../entities/operation";
import { validateObjectKeys, ObjectKeyType } from "../utils/validation.utils";
import {
  sendOperationStateChange,
  sendUpdateOperation,
  sendUvr,
} from "../apis/socket-io/async-browser-comunication";

import {
  getPaginationParametersFromRequestQuery,
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
  removeNullProperties,
  CustomError,
} from "./utils";
import { NotFoundError } from "../daos/db-errors";
import ParseUtils from "./utils/parse.utils";
export class UASVolumeReservationController {
  private dao = new UASVolumeReservationDao();
  private operationDao = new OperationDao();

  /**
   * Get all uvrs from database
   * @param request
   * @param response
   * @param next
   */
  async all(request: Request, response: Response) {
    try {
      const { take, skip, filterBy, filter, orderBy, order } =
        getPaginationParametersFromRequestQuery(request.query);
      const showPast = request.query.showPast === 'true';
      const list = await this.dao.all(
        take,
        skip,
        filterBy,
        filter,
        orderBy,
        order,
        showPast
      );
      list.uvrs = list.uvrs.map((uvr) => removeNullProperties(uvr, false));
      return logAndRespond200(response, list, []);
    } catch (error) {
      if (error instanceof CustomError) {
        return logAndRespond400(response, 400, (error as CustomError).message);
      }
      return logAndRespond400(response, 400, null);
    }
  }

  /**
   * Get the uvr with the id passed
   * @example /uasvolume/0a8c53a7-4300-472d-844b-c0cfed9f1b17
   * @param request
   * @param response
   * @param next
   */
  async one(request: Request, response: Response) {
    try {
      const uas = removeNullProperties(
        await this.dao.one(request.params.id),
        false
      );
      return logAndRespond200(response, uas, []);
    } catch (error) {
      return logAndRespond400(response, 404, null);
    }
  }

  /**
   * Save the passed operation by post
   * @example {
   *    "uss_name": null,
   *    "type": "DYNAMIC_RESTRICTION",
   *    "permitted_uas": [
   *        "PART_107"
   *    ],
   *    "required_support": [
   *        "ENHANCED_SAFE_LANDING"
   *    ],
   *    "cause": "MUNICIPALITY",
   *    "geography": { "type": "Polygon", "coordinates": [[[-56.159834861755364, -34.91795954238727], [-56.16240978240967, -34.92221734956747], [-56.15567207336426, -34.922569224576016], [-56.15395545959473, -34.920141256305946], [-56.159834861755364, -34.91795954238727]]] },
   *    "effective_time_begin": "2020-03-11T19:59:10.000Z",
   *    "effective_time_end": "2020-03-11T20:59:10.000Z",
   *    "actual_time_end": null,
   *    "min_altitude": "20",
   *    "max_altitude": "50",
   *    "reas
   * @param request
   * @param response
   * @param next
   */
  async save(request: Request, response: Response) {
    const requestBody = removeNullProperties(request.body, false);
    if (requestBody.message_id) {
      return logAndRespond400(
        response,
        400,
        "You can not send the message_id when you create a new uvr"
      );
    }
    let uvr: UASVolumeReservation;
    try {
      uvr = this.convertAnyToUVR(requestBody);
    } catch (error) {
      return logAndRespond400(response, 400, `${(error as Error).message}`);
    }
    try {
      const entitie = await this.dao.save(uvr);
      //get operations that need to chage the state
      if (uvr.type === UASVolumeReservationType.DYNAMIC_RESTRICTION) {
        try {
          const operations = await this.operationDao.getOperationByVolume(
            new Date(uvr.effective_time_begin!),
            new Date(uvr.effective_time_end!),
            uvr.min_altitude!,
            uvr.max_altitude!,
            uvr.geography!
          );
          // console.log(JSON.stringify(operations, null, 2))
          for (let index = 0; index < operations.length; index++) {
            try {
              const operation: Operation = operations[index];
              // console.log(`The operation ${op.gufi} intersect with this uvr`)
              const newState: OperationState = getNextOperationState(operation);
              // console.log(`The opertion ${op.gufi} chage the state from ${op.state} to ${newState}`)
              if (newState != operation.state) {
                const oldState = operation.state;
                operation.state = newState;
                this.operationDao.updateState(
                  operation.gufi,
                  newState,
                  oldState,
                  `UVR ${entitie.message_id} intersected with operation`
                );
                sendOperationStateChange(
                  operation.gufi,
                  operation.state,
                  `UVR_INTERSECT;uvrId=${entitie.message_id}`
                );
                sendUpdateOperation({
                  gufi: operation.gufi,
                  name: operation.name,
                  state: operation.state,
                  previousState: oldState,
                  owner: operation.owner,
                });
              }
            } catch (error) {
              return logAndRespond500(response, 500, error);
            }
          }
        } catch (error) {
          console.log(error);
          return logAndRespond500(response, 500, error);
        }

      }
      sendUvr({ message_id: entitie.message_id! });
      return logAndRespond200(response, entitie, []);
    } catch (error) {
      console.log(error);
      return logAndRespond400(response, 400, null);
    }
  }

  /**
   * @param request
   * @param response
   * @param next
   */
  async remove(request: Request, response: Response) {
    try {
      await this.dao.remove(request.params.id);
      return logAndRespond200(response, null, []);
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
  }

  private convertAnyToUVR(obj: any): UASVolumeReservation {
    validateObjectKeys(
      obj,
      [
        { name: "geography", type: ObjectKeyType.OBJECT },
        { name: "effective_time_begin", type: ObjectKeyType.STRING },
        { name: "effective_time_end", type: ObjectKeyType.STRING },
        { name: "min_altitude", type: ObjectKeyType.NUMBER },
        { name: "max_altitude", type: ObjectKeyType.NUMBER },
      ],
      [
        { name: "message_id", type: ObjectKeyType.STRING },
        { name: "uss_name", type: ObjectKeyType.STRING },
        { name: "type", type: ObjectKeyType.STRING },
        { name: "permitted_uas", type: ObjectKeyType.OBJECT },
        { name: "required_support", type: ObjectKeyType.OBJECT },
        { name: "permitted_operations", type: ObjectKeyType.OBJECT },
        { name: "permitted_gufis", type: ObjectKeyType.OBJECT },
        { name: "cause", type: ObjectKeyType.STRING },
        { name: "actual_time_end", type: ObjectKeyType.STRING },
        { name: "reason", type: ObjectKeyType.STRING },
        { name: "deletedAt", type: ObjectKeyType.STRING },
        { name: "enaire_layer_id", type: ObjectKeyType.STRING },
        { name: "enaire_notam_id", type: ObjectKeyType.STRING },
      ]
    );
    const result = new UASVolumeReservation();
    result.geography = ParseUtils.parseAnyToPolygon(obj.geography);
    result.effective_time_begin = obj.effective_time_begin;
    result.effective_time_end = obj.effective_time_end;
    result.min_altitude = obj.min_altitude;
    result.max_altitude = obj.max_altitude;
    result.message_id = obj.message_id;
    result.uss_name = obj.uss_name;
    result.type = obj.type;
    result.permitted_uas = obj.permitted_uas;
    result.required_support = obj.required_support;
    result.permitted_operations = obj.permitted_operations;
    result.permitted_gufis = obj.permitted_gufis;
    result.cause = obj.cause;
    result.actual_time_end = obj.actual_time_end;
    result.reason = obj.reason;
    result.deletedAt = obj.deletedAt;
    result.enaire_layer_id = obj.enaire_layer_id;
    result.enaire_notam_id = obj.enaire_notam_id;
    return result;
  }
}

function getNextOperationState(operation: Operation) {
  let newState: OperationState = operation.state;
  switch (operation.state) {
    case OperationState.PROPOSED:
      newState = OperationState.CLOSED;
      break;
    case OperationState.NOT_ACCEPTED:
      break;
    case OperationState.ACCEPTED:
      newState = OperationState.CLOSED;
      break;
    case OperationState.ACTIVATED:
      newState = OperationState.ROGUE;
      break;
    case OperationState.NONCONFORMING:
      newState = OperationState.ROGUE;
      break;
    // case OperationState.ROGUE:
    //     break;
    default:
      break;
  }
  return newState;
}
