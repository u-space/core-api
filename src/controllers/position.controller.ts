/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import {
  sendOperationFlyStatus,
  sendOperationStateChange,
  sendPositionToMonitor,
  sendTrackerPosition,
  sendUpdateOperation,
} from "../apis/socket-io/async-browser-comunication";
import { OperationDao } from "../daos/operation.dao";
import { PilotPositionDao } from "../daos/pilot-position.dao";
import { PositionDao } from "../daos/position.dao";
import { Operation, OperationState } from "../entities/operation";
import { Position } from "../entities/position";

import { validationResult } from "express-validator";

import { stringify } from "querystring";
import { logError, logInfo } from "../services/winston-logger.service";

import { TrackersDao } from "../daos/trackers/tracker.dao";
import { logger } from "../utils/logger/main.logger";
import {
  getErrorMessageFromExpressValidatorErrors,
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
} from "./utils";

import uuidValidate from "uuid-validate";

export class PositionController {
  private dao = new PositionDao();
  private operationDao: any;
  private pilotPositionDao = new PilotPositionDao();
  private trackerDao = new TrackersDao();

  async all(request: Request, response: Response) {
    return logAndRespond200(response, await this.dao.all(), []);
  }

  async one(request: Request, response: Response) {
    return logAndRespond200(
      response,
      await this.dao.one(request.params.id),
      []
    );
  }

  async oneByGufiWithDates(request: Request, response: Response) {
    const query = request.query as { [key: string]: string };
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
      return logAndRespond400(
        response,
        400,
        getErrorMessageFromExpressValidatorErrors(errors)
      );
    }
    const { gufi } = request.query as { [key: string]: string };
    if (!uuidValidate(gufi)) {
      return logAndRespond400(response, 400, `Invalid gufi [gufi=${gufi}]`);
    }
    const time_start = new Date(query.time_start);
    const time_end = new Date(query.time_end);
    try {
      const positions = await this.dao.oneByGufiWithDates(
        gufi,
        time_start,
        time_end
      );
      return logAndRespond200(
        response,
        positions.map((position) => ({
          ...position,
          gufi: position.gufi.gufi,
          uvin: position.uvin?.uvin,
        })),
        []
      );
    } catch (error: any) {
      logError(
        `There was an error trying to fetch positions by [gufi=${gufi},startDate=${time_start},endDate=${time_end}]`,
        error
      );
      return logAndRespond500(response, 500, error);
    }
  }

  /**
   * Save a position. If the position dont intersect with associated operation change the state to ROUGE
   * @example {
   *       {
   *       "altitude_gps": 35,
   *       "location": {
   *         "type": "Point",
   *         "coordinates": [
   *           -56.13910222528544,
   *           -34.99516625088092
   *         ]
   *       },
   *       "heading": 101,
   *       "time_sent": "2021-11-05T18:06:55.834Z",
   *       "gufi": "d069960a-3902-4755-bd3b-cc6ea6c38226",
   *       "uvin": "0bfd5564-1b68-4a0f-b976-69404390aade"
   *     }
   * @param request
   * @param response
   * @param next
   */
  async save(request: Request, response: Response) {
    try {
      const gufi = request.body.gufi;
      let errors = [];
      errors = validatePosition(request.body);
      if (typeof gufi === "undefined") {
        errors.push("'gufi' was not received");
      }
      if (errors.length == 0) {
        //add operationId
        request.body.operationId = gufi;
        //save position
        const position = await this.dao.save(request.body);

        //check if position is inside de operation volume of associated operation
        const inOperation = await this.dao.checkPositionWithOperation(position);

        if (this.operationDao == undefined) {
          this.operationDao = new OperationDao();
        }
        const operation: Operation = await this.operationDao.one(gufi);
        if (!inOperation) {
          const lastState = operation.state;

          if (lastState !== OperationState.ROGUE) {
            //if position is not inside the associated operation then change operation status as ROUGE
            await this.operationDao.updateState(
              gufi,
              OperationState.ROGUE,
              lastState,
              "Position outside operation volume "
            );
            sendOperationStateChange(
              operation.gufi,
              OperationState.ROGUE,
              "Vehicle left operation volume"
            );

            sendUpdateOperation({
              gufi: operation.gufi,
              name: operation.name,
              state: OperationState.ROGUE,
              previousState: lastState,
              owner: operation.owner,
            });
          }
        }

        //send information to web browser
        sendOperationFlyStatus(inOperation);

        const pilotPosition = await this.pilotPositionDao.findLastPosition(
          gufi
        );
        const publicPosition = request.body.public;

        if (pilotPosition === undefined) {
          sendPositionToMonitor(
            position,
            operation.controller_location,
            publicPosition
          );
        } else {
          sendPositionToMonitor(
            position,
            pilotPosition.location,
            publicPosition
          );
        }

        return logAndRespond200(response, position, []);
      } else {
        return logAndRespond400(response, 400, null);
      }
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
    return response.sendStatus(501);
  }

  /**
   * Save a position. If the position dont intersect with associated operation change the state to ROUGE
   * @example {
   *     "altitude_gps": 30,
   *     "location": {"type": "Point","coordinates": [-56.1636114120483,-34.9068213410793]},
   *     "time_sent": "2019-12-11T19:59:10.000Z",
   *     "uvin" : "f7891e78-9bb4-431d-94d3-1a506910c254",
   *     "heading" : 160,
   *     "trackerId" : "trackerIdHere", (optional)
   *     "rssi" : -50, (optional)
   * }
   * @param request
   * @param response
   * @param next
   */
  async savePositionWithDrone(request: Request, response: Response) {
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
      return logAndRespond400(
        response,
        400,
        getErrorMessageFromExpressValidatorErrors(errors)
      );
    }
    let { time_sent } = request.body;
    const { uvin, altitude_gps, location, heading, trackerId, rssi } =
      request.body;
    //If time sent is undefined then set actual time
    if (!time_sent) {
      time_sent = new Date().toISOString();
    }
    try {
      //save position
      if (this.operationDao == undefined) {
        this.operationDao = new OperationDao();
      }
      const operations = await this.operationDao.getOperationByPositionAndDrone(
        location,
        altitude_gps,
        time_sent,
        uvin
      );
      console.log(`\t*** ${JSON.stringify(operations, null, 2)}`);
      if (operations.length > 1) {
        logInfo(
          `There are more than one operation [uvin=${uvin},altitude_gps=${altitude_gps},location=${stringify(
            location
          )},time_sent=${time_sent},heading=${heading}]`
        );
        return logAndRespond400(
          response,
          400,
          "There are more than one operation"
        );
      }
      if (operations.length == 0) {
        logInfo(
          `No operation on the drone flight [uvin=${uvin},altitude_gps=${altitude_gps},location=${stringify(
            location
          )},time_sent=${new Date(time_sent)},heading=${heading}]`
        );
        return logAndRespond400(
          response,
          400,
          "No operation on the drone flight"
        );
      }
      const operation = operations[0];
      const posToSave = {
        altitude_gps: altitude_gps,
        location: location,
        time_sent: time_sent,
        gufi: operation,
        heading: heading,
        uvin: { uvin: uvin },
      };

      const position: Position = await this.dao.save(posToSave);

      // position = await this.dao.one(position.id+'')

      if (trackerId) {
        if (rssi === undefined) {
          logInfo(
            `trackingId is defined but rssi is not [trackerId=${trackerId}]`
          );
          return logAndRespond400(
            response,
            400,
            "trackingId is defined but rssi is not"
          );
        }
        const tracker = await this.trackerDao.one(trackerId, false);
        if (!tracker) {
          logInfo(`tracker not found [trackerId=${trackerId}]`);
          return logAndRespond400(
            response,
            404,
            "Tracker not found hence cannot save rssi"
          );
        }
        const rssiData = {
          RSSI: rssi,
          position: position.id,
          tracker: tracker.hardware_id,
        };
        const rssiDataSaved = await this.trackerDao.saveRSSIData(rssiData);
        logInfo(`rssiData saved [${rssiDataSaved}]`);
      }

      //send information to web browser
      sendOperationFlyStatus(true);
      sendPositionToMonitor(position, operation.controller_location);
      sendTrackerPosition(position, operation.gufi);
      return logAndRespond200(response, "Position Saved", []);
    } catch (error: any) {
      logError(
        `There was an error trying to save the position received [uvin=${uvin},altitude_gps=${altitude_gps},location=${stringify(
          location
        )},time_sent=${time_sent},heading=${heading}]`,
        error
      );
      return logAndRespond500(response, 500, error);
    }
  }

  /**
   * Save a position. If the position dont intersect with associated operation change the state to ROUGE
   * @example {
   *     "altitude_gps": 30,
   *     "location": {"type": "Point","coordinates": [-56.1636114120483,-34.9068213410793]},
   *     "time_sent": "2019-12-11T19:59:10.000Z",
   *     "uvin" : "f7891e78-9bb4-431d-94d3-1a506910c254",
   *     "heading" : 160
   * }
   * @param request
   * @param response
   * @param next
   */
  async savePositionWithDroneTrackerIdWebService(
    request: Request,
    response: Response
  ) {
    try {
      // let gufi = request.body.gufi
      let errors = [];
      errors = validatePosition(request.body);
      const { trackerId, altitude_gps, location, time_sent, heading } =
        request.body;
      if (errors.length == 0) {
        //save position
        const position = await this.savePositionWithDroneTrackerId(
          trackerId,
          altitude_gps,
          location,
          time_sent,
          heading
        );
        return logAndRespond200(response, position, []);
      } else {
        return logAndRespond400(response, 400, null);
      }
    } catch (error) {
      console.error(error);
      return logAndRespond400(response, 400, null);
    }
  }

  async savePositionWithDroneTrackerId(
    trackerId: any,
    altitude_gps: any,
    location: any,
    time_sent: any,
    heading: any
  ) {
    if (this.operationDao == undefined) {
      this.operationDao = new OperationDao();
    }
    try {
      const operations =
        await this.operationDao.getOperationByPositionAndDroneTrackerId(
          location,
          altitude_gps,
          time_sent,
          trackerId
        );
      if (operations.length > 1) {
        throw "There are more than one operation";
      }
      if (operations.length == 0) {
        // throw 'No operation on the drone flight';
        return;
      }
      const operation = operations[0];
      const posToSave = {
        altitude_gps: altitude_gps,
        location: location,
        time_sent: time_sent,
        gufi: operation,
        heading: heading,
      };

      const position = await this.dao.save(posToSave);

      //send information to web browser
      sendOperationFlyStatus(true);
      // console.log(`Send new position ${position}`)
      sendPositionToMonitor(position, operation.controller_location);
      // return position;
      return;
    } catch (error) {
      //TODO no loggear el error
      logger.error(
        `Error savePositionWithDroneTrackerId ${JSON.stringify(error)}`
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async saveFromMQTT(position: any, _username: string) {
    try {
      const gufi = position["gufi"];
      let errors = [];
      errors = validatePosition(position);
      if (typeof gufi === "undefined") {
        errors.push("gufi was not received");
      }
      if (errors.length == 0) {
        //save position
        const positionSaved = await this.dao.save(position);

        //check if position is inside de operation volume of associated operation
        const inOperation = await this.dao.checkPositionWithOperation(
          positionSaved
        );

        if (this.operationDao == undefined) {
          this.operationDao = new OperationDao();
        }
        const operation: Operation = await this.operationDao.one(gufi);
        if (!inOperation) {
          const lastState = operation.state;

          if (lastState !== OperationState.ROGUE) {
            //if position is not inside the associated operation then change operation status as ROUGE
            await this.operationDao.updateState(
              gufi,
              OperationState.ROGUE,
              lastState,
              "position outside operation volume"
            );
            sendOperationStateChange(
              operation.gufi,
              OperationState.ROGUE,
              "Vehicle left operation volume"
            );
            sendUpdateOperation({
              gufi: operation.gufi,
              name: operation.name,
              state: OperationState.ROGUE,
              previousState: lastState,
              owner: operation.owner,
            });
          }
        }

        //send information to web browser
        sendOperationFlyStatus(inOperation);

        const pilotPosition = await this.pilotPositionDao.findLastPosition(
          gufi
        );

        if (pilotPosition === undefined) {
          sendPositionToMonitor(positionSaved, operation.controller_location);
        } else {
          sendPositionToMonitor(positionSaved, pilotPosition.location);
        }

        return;
      } else {
        return;
      }
    } catch (error) {
      console.error(error);
      return;
    }
  }
}

function validatePosition(position: any) {
  const errors = [];
  if (position["heading"] != undefined) {
    if (
      !(
        typeof position["heading"] == "number" &&
        position["heading"] >= -180 &&
        position["heading"] <= 180
      )
    ) {
      errors.push("Invalid heading");
    }
  }
  return errors;
}
