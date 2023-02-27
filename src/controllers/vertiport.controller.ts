/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { InvalidDataError } from "../daos/db-errors";
import { VertiportDao } from "../daos/vertiport.dao";
import { Vertiport } from "../entities/vertiport";
import GeneralUtils from "../utils/general.utils";
import { parseVertiport, ParsingIdCriteria } from "../utils/parse.utils";
import {
  CustomError,
  getPaginationParametersFromRequestQuery,
  logAndRespond200,
  logAndRespond400,
  logAndRespond500,
} from "./utils";

export class VertiportController {
  private vertiportDao: VertiportDao;

  constructor(vertiportDao?: VertiportDao) {
    this.vertiportDao = vertiportDao || new VertiportDao();
  }

  async all(request: Request, response: Response) {
    try {
      const { take, skip, filterBy, filter, orderBy, order } =
        getPaginationParametersFromRequestQuery(request.query);
      const vertiports: Vertiport[] = await this.vertiportDao.all(
        take,
        skip,
        filterBy,
        filter,
        orderBy,
        order
      );
      logAndRespond200(response, vertiports, []);
    } catch (error) {
      if (error instanceof InvalidDataError || error instanceof CustomError) {
        return logAndRespond400(response, 400, error.message);
      } else {
        return logAndRespond500(response, 500, error);
      }
    }
  }

  async save(request: Request, response: Response) {
    let vertiportReceived: Vertiport;
    try {
      vertiportReceived = parseVertiport(
        request.body,
        ParsingIdCriteria.WITHOUT_ID
      );
    } catch (error) {
      return logAndRespond400(
        response,
        400,
        GeneralUtils.getErrorMessage(error)
      );
    }

    try {
      const vertiportAdded: Vertiport = await this.vertiportDao.save(
        vertiportReceived
      );
      logAndRespond200(response, vertiportAdded, []);
    } catch (error) {
      console.log(error);
      logAndRespond500(response, 500, error);
    }
  }
}
