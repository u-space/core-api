/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { RestrictedFlightVolumeDao } from "../daos/restricted-flight-volume.dao";
import { RestrictedFlightVolume } from "../entities/restricted-flight-volume";
import { OperationVolume } from "../entities/operation-volume";
import { OperationDao } from "../daos/operation.dao";
import { Operation, OperationState } from "../entities/operation";

import {
  CustomError,
  getPaginationParametersFromRequestQuery,
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
} from "./utils";
import { InvalidDataError, NotFoundError } from "../daos/db-errors";
import { sendOperationStateChange } from "../apis/socket-io/async-browser-comunication";
import ParseUtils from "./utils/parse.utils";
export class RestrictedFlightVolumeController {
  private dao = new RestrictedFlightVolumeDao();
  private operationDao = new OperationDao();

  /**
   * Get all rfv from database
   * @param request
   * @param response
   * @param next
   */
  async all(request: Request, response: Response) {
    try {
      const { take, skip, filterBy, filter, orderBy, order } =
        getPaginationParametersFromRequestQuery(request.query);
      const list = await this.dao.all(
        take,
        skip,
        filterBy,
        filter,
        orderBy,
        order
      );
      return logAndRespond200(response, list, []);
    } catch (error) {
      if (error instanceof InvalidDataError || error instanceof CustomError) {
        return logAndRespond400(response, 400, error.message);
      } else {
        console.error(error);
        return logAndRespond500(response, 500, error);
      }
    }
  }

  /**
   * Get the rfv with the id passed
   * @example /restrictedflightvolume/0a8c53a7-4300-472d-844b-c0cfed9f1b17
   * @param request
   * @param response
   * @param next
   */
  async one(request: Request, response: Response) {
    try {
      const uas = await this.dao.one(request.params.id);
      return logAndRespond200(response, uas, []);
    } catch (error) {
      return logAndRespond400(response, 404, null);
    }
    // return response.json(await this.dao.one(request.params.id));
  }

  /**
     * Save the passed RestrictedFlightVolume by post
     * @example POST @example /restrictedflightvolume/{
            geography: {"type":"Polygon","coordinates":[[[-56.309738,-34.874384],[-56.309395,-34.903671],[-56.245537,-34.9017],[-56.24588,-34.864806],[-56.310081,-34.872975],[-56.309738,-34.874384]]]},
            max_altitude: 100,
            min_altitude: 0,
            comments: "Montevideo Hill"
        }
     * @param request
     * @param response
     * @param next
     */
  async save(request: Request, response: Response) {
    let rfv: RestrictedFlightVolume;
    try {
      rfv = ParseUtils.parseAnyToRestrictedFlightVolume(request.body);
    } catch (error) {
      return logAndRespond400(response, 400, `${(error as Error).message}`);
    }
    try {
      const entitie = await this.dao.save(rfv);
      const volume = createVolumeFromRestrictedFlightVolume(entitie);
      const operations =
        await this.operationDao.getOperationByPolygonAndAltitude(
          volume.min_altitude,
          volume.max_altitude,
          volume.operation_geography
        );
      for (let index = 0; index < operations.length; index++) {
        const op: Operation = operations[index];
        const oldState = op.state;
        const newState: OperationState = getNextOperationState(op);
        if (newState != op.state) {
          op.state = newState;
          this.operationDao.updateState(
            op.gufi,
            newState,
            oldState,
            "RFV intersected with operation"
          );
          sendOperationStateChange(op.gufi, newState, "RFV saved");
        }
      }
      return logAndRespond200(response, entitie, []);
    } catch (error) {
      console.error(error);
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
}

function createVolumeFromRestrictedFlightVolume(uvr: RestrictedFlightVolume) {
  const operationVolume: OperationVolume = new OperationVolume();

  const baseDate = new Date();
  operationVolume.effective_time_begin = baseDate.toISOString();

  const endDate = new Date(baseDate);
  endDate.setFullYear(baseDate.getFullYear() + 3);
  operationVolume.effective_time_end = endDate.toISOString();

  operationVolume.min_altitude = uvr.min_altitude;
  operationVolume.max_altitude = uvr.max_altitude;
  operationVolume.operation_geography = uvr.geography;
  return operationVolume;
}

function getNextOperationState(operation: Operation) {
  let newState: OperationState = operation.state;
  switch (operation.state) {
    case OperationState.PROPOSED:
      newState = OperationState.PENDING;
      break;
    // case OperationState.NOT_ACCEPTED:
    //     break;
    case OperationState.ACCEPTED:
      newState = OperationState.CLOSED;
      break;
    case OperationState.ACTIVATED:
      newState = OperationState.CLOSED;
      break;
    // case OperationState.NONCONFORMING:
    //     // newState = OperationState.ROGUE
    //     break;
    // case OperationState.ROGUE:
    //     break;
    default:
      break;
  }
  return newState;
}
