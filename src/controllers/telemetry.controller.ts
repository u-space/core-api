/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { TelemetryService } from "../services2/telemetry.service";
import { PostTelemetryDto } from "./dtos/telemetry.dto";
import { logAndRespond200, logAndRespond400, logAndRespond500 } from "./utils";
import Joi from "joi";
import { getPayloadFromResponse } from "../utils/auth.utils";
import * as ServiceTypes from "../services2/_types";

export class TelemetryController {
  private telemetryService = new TelemetryService();

  async postTelemetry(req: Request, res: Response) {
    const { username } = getPayloadFromResponse(res);

    const dto: PostTelemetryDto = req.body;

    // validate request body
    try {
      validatePostTelemetryDto(dto);
    } catch (error) {
      return logAndRespond400(res, 400, (error as Error).message);
    }

    try {
      const result = await this.telemetryService.addTelemetry(username, {
        timestamp: dto.timestamp,
        lat: dto.lat,
        lon: dto.lon,
        publicTelemetry: dto.publicTelemetry === true,
        gufi: dto.gufi,
        uvin: dto.uvin,
        comments: dto.comments,
        heading: dto.heading,
        altitudeAbs: dto.altitudeAbs,
        altitudeRel: dto.altitudeRel,
        inAir: dto.inAir,
      });
      logAndRespond200(res, result, []);
    } catch (error) {
      if (error instanceof ServiceTypes.InvalidDataError) {
        return logAndRespond400(
          res,
          400,
          (error as ServiceTypes.InvalidDataError).message
        );
      } else if (error instanceof ServiceTypes.NotFoundError) {
        return logAndRespond400(
          res,
          404,
          (error as ServiceTypes.NotFoundError).message
        );
      }
      return logAndRespond500(res, 500, error, true);
    }
  }
}

// ---------------------------------------------------------
// -------------------- PRIVATE METHODS --------------------
// ---------------------------------------------------------

function validatePostTelemetryDto(dto: PostTelemetryDto) {
  const schema = Joi.object().keys({
    timestamp: Joi.number().required(),
    lat: Joi.number().required(),
    lon: Joi.number().required(),
    publicTelemetry: Joi.boolean().optional(),
    gufi: Joi.string().optional(),
    uvin: Joi.string().optional(),
    comments: Joi.string().optional(),
    heading: Joi.number().optional(),
    altitudeAbs: Joi.number().optional(),
    altitudeRel: Joi.number().optional(),
    inAir: Joi.boolean().optional(),
  });
  const validationResult = schema.validate(dto);
  if (validationResult.error) {
    throw new Error(validationResult.error.message);
  }
}
