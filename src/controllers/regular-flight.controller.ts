/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { parseRegularFlight } from "../utils/parse.utils";
import { RegularFlightDao } from "../daos/regular-flight.dao";
import { RegularFlight } from "../entities/regular-flight";
import {
  CustomError,
  getPaginationParametersFromRequestQuery,
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
} from "./utils";
import { InvalidDataError } from "../daos/db-errors";
import GeneralUtils from "../utils/general.utils";

export class RegularFlightController {
  private regularFlightDao: RegularFlightDao = new RegularFlightDao();

  async all(request: Request, response: Response) {
    try {
      const { take, skip, filterBy, filter, orderBy, order } =
        getPaginationParametersFromRequestQuery(request.query);
      const regularFlightsAndCount: {
        count: number;
        regularFlights: RegularFlight[];
      } = await this.regularFlightDao.all(
        take,
        skip,
        filterBy,
        filter,
        orderBy,
        order
      );
      logAndRespond200(response, regularFlightsAndCount, []);
    } catch (error) {
      if (error instanceof InvalidDataError || error instanceof CustomError) {
        return logAndRespond400(response, 400, error.message);
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
  }

  async one(request: Request, response: Response) {
    try {
      const regularFlight: RegularFlight = await this.regularFlightDao.one(
        request.params.id
      );
      logAndRespond200(response, regularFlight, []);
    } catch (error) {
      if (error instanceof InvalidDataError || error instanceof CustomError) {
        return logAndRespond400(response, 400, error.message);
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
  }

  async save(request: Request, response: Response) {
    let regularFlightReceived: RegularFlight;
    try {
      regularFlightReceived = parseRegularFlight(request.body, false);
      //This puts first segment start point to be the same as vertiport point
      //and same idea to last segment ending point
      //FIXME: this is having error cause entity is not parsed
      // regularFlightReceived.correctStartEndPoints();
    } catch (error) {
      return logAndRespond400(
        response,
        400,
        GeneralUtils.getErrorMessage(error)
      );
    }
    try {
      const regularFlightAdded: RegularFlight =
        await this.regularFlightDao.save(regularFlightReceived);
      logAndRespond200(response, regularFlightAdded, []);
    } catch (error) {
      console.log(error);
      logAndRespond500(response, 500, error);
    }
  }

  async createOperationFromRegularFlight(request: Request, response: Response) {
    response.send("operation");
  }
}
