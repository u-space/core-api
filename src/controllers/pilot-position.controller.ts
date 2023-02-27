/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { PilotPositionDao } from "../daos/pilot-position.dao";
import { PilotPosition } from "../entities/pilot-position";

import { validationResult } from "express-validator";

import {
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
  getErrorMessageFromExpressValidatorErrors,
} from "./utils";

export class PilotPositionController {
  private dao = new PilotPositionDao();

  async save(request: Request, response: Response) {
    // validate request
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
      return logAndRespond400(
        response,
        400,
        getErrorMessageFromExpressValidatorErrors(errors)
      );
    }
    let pilotPosition = null;
    try {
      pilotPosition = parsePilotPosition(request);
    } catch (err: any) {
      return logAndRespond400(response, 400, err.message);
    }

    // save position into database
    try {
      const result = await this.dao.save(pilotPosition);
      return logAndRespond200(response, result, []);
    } catch (err) {
      return logAndRespond500(response, 500, err);
    }
  }
}

//-------------------------------------------------------------------------------
//------------------------------ PRIVATE FUNCTIONS ------------------------------
//-------------------------------------------------------------------------------

function parsePilotPosition(request: Request) {
  const requestBody = request.body;
  if (typeof requestBody === "undefined") {
    throw new Error("Request body was not received");
  }

  // verify location is valid
  if (typeof requestBody.location === "undefined") {
    throw new Error("location was not received");
  }
  if (typeof requestBody.location.type === "undefined") {
    throw new Error("location.type was not received");
  }
  if (requestBody.location.type !== "Point") {
    throw new Error("location.type must be 'Point'");
  }
  if (typeof requestBody.location.coordinates === "undefined") {
    throw new Error("location.coordinates was not received");
  }
  if (!Array.isArray(requestBody.location.coordinates)) {
    throw new Error("location.coordinates is not an array");
  }
  if (requestBody.location.coordinates.length !== 2) {
    throw new Error("location.coordinates must be an array with 2 items");
  }
  if (typeof requestBody.location.coordinates[0] !== "number") {
    throw new Error("location.coordinates[0] must be a number");
  }
  if (typeof requestBody.location.coordinates[1] !== "number") {
    throw new Error("location.coordinates[1] must be a number");
  }

  // verify the rest of the data
  if (typeof requestBody.altitude_gps !== "number") {
    throw new Error("altitude_gps must be a number");
  }
  if (typeof requestBody.time_sent !== "string") {
    throw new Error("time_sent must be a string");
  }
  if (typeof requestBody.gufi !== "string") {
    throw new Error("gufi must be a string");
  }

  // parse the data
  const result = new PilotPosition();
  result.altitude_gps = requestBody.altitude_gps;
  result.gufi = requestBody.gufi;
  result.time_sent = requestBody.time_sent;
  result.location = requestBody.location;

  // return result
  return result;
}
