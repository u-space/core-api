/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";

import { validationResult } from "express-validator";

import { logError } from "../services/winston-logger.service";

import {
  getErrorMessageFromExpressValidatorErrors,
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
} from "./utils";

import uuidValidate from "uuid-validate";
import {
  RidService,
  transformToEntityPosition,
} from "../apis/rid-server/rid-service";

export class PositionRidController {
  private ridService = new RidService();

  async all(request: Request, response: Response) {
    return logAndRespond200(
      response,
      await this.ridService.getAllPositions(),
      []
    );
    // return logAndRespond200(response, await this.dao.all(), []);
  }

  async one(request: Request, response: Response) {
    const id = request.params.id;
    if (id) {
      const position = await this.ridService.getLastPosition();
      return logAndRespond200(response, position, []);
    }
    return logAndRespond400(response, 400, "Missing required parameter: id");
  }

  async oneByGufiWithDates(request: Request, response: Response) {
    const query = request.query as { [key: string]: string };
    const time_start = new Date(query.time_start);
    const time_end = new Date(query.time_end);
    const { gufi } = request.query as { [key: string]: string };

    console.log(
      `PositionGufiWithDates::opId:${gufi},time_start:${time_start},time_end:${time_end}`
    );

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
      return logAndRespond400(
        response,
        400,
        getErrorMessageFromExpressValidatorErrors(errors)
      );
    }
    if (!uuidValidate(gufi)) {
      console.log("error gufi: ", gufi);
      return logAndRespond400(response, 400, `Invalid gufi [gufi=${gufi}]`);
    }
    try {
      const positions = await this.ridService.getPositionsByOperationId(gufi);
      console.log("-------#Positions:", positions.length);
      const processedPositions = positions
        .map(transformToEntityPosition)
        .map((position) => ({
          ...position,
          gufi: position.gufi.gufi,
          uvin: position.uvin?.uvin,
        }));

      return logAndRespond200(response, processedPositions, []);
    } catch (error: any) {
      console.log("error::", error);
      logError(
        `There was an error trying to fetch positions by [gufi=${gufi},startDate=${time_start},endDate=${time_end}]`,
        error
      );
      return logAndRespond500(response, 500, error);
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
