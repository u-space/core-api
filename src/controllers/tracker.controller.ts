/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { getPayloadFromResponse } from "../utils/auth.utils";

import {
  getErrorMessageFromExpressValidatorErrors,
  logAndRespond200,
  logAndRespond400,
} from "./utils";
import { TrackersDao } from "../daos/trackers/tracker.dao";
import { Role } from "../entities/user";
import { VehicleDao } from "../daos/vehicle.dao";
import { validationResult } from "express-validator";
import { app } from "../main";
export class TrackersController {
  private dao = new TrackersDao();
  private vehicleDao = new VehicleDao();

  /**
   * Get all trackers, or only of logged in user if not admin/monitor
   * @param request
   * @param response
   * @param next
   */
  async all(request: Request, response: Response) {
    const isCentral = app.enabledModules.get("central") !== "false";
    try {
      const { take, skip, filterBy, filter } = request.query as {
        [key: string]: string;
      };
      const parsedTake = parseInt(take as string);
      const parsedSkip = parseInt(skip as string);
      const { role } = getPayloadFromResponse(response);
      if (role == Role.ADMIN || role == Role.MONITOR) {
        const [trackers, count] = await this.dao.all(
          isCentral,
          parsedTake,
          parsedSkip,
          filterBy,
          filter
        );
        return logAndRespond200(response, { trackers, count }, []);
      } else {
        const [trackers, count] = await this.dao.all(
          isCentral,
          parsedTake,
          parsedSkip,
          filterBy,
          filter
        );
        return logAndRespond200(response, { trackers, count }, []);
      }
    } catch (error) {
      console.log(error);
      return logAndRespond400(response, 400, null);
    }
  }

  async getById(request: Request, response: Response) {
    const isCentral = app.enabledModules.get("central") !== "false";
    try {
      const { role, username } = getPayloadFromResponse(response);
      const one: any = await this.dao.one(request.params.id, isCentral);
      //If i couldnt find it returns error 404
      if (one === null) {
        return logAndRespond400(response, 404, "no tracker found");
      }
      if (role == Role.ADMIN || role == Role.MONITOR) {
        return logAndRespond200(response, one, []);
      } else {
        const authorized =
          one.vehicle &&
          (one.vehicle.owner!.username === username ||
            one.vehicle.operators!.some(
              (operator: any) => operator.username === username
            ));
        if (authorized) {
          return logAndRespond200(response, one, []);
        } else {
          return logAndRespond400(
            response,
            401,
            "the tracker is not owned or operated by the currently logged in user"
          );
        }
      }
    } catch (error) {
      console.log(error);
      return logAndRespond400(response, 400, null);
    }
  }

  /**
   *
   * @param request
   * @param response
   * @param next
   */
  async save(request: Request, response: Response) {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) {
        return logAndRespond400(
          response,
          400,
          getErrorMessageFromExpressValidatorErrors(errors)
        );
      }
      const { role, username } = getPayloadFromResponse(response);
      const vehicle = await this.vehicleDao.one(request.body.uvin);
      if (role !== Role.ADMIN && vehicle.owner!.username !== username) {
        return logAndRespond400(
          response,
          400,
          "the vehicle is not owned by the currently logged in user"
        );
      }
      const one = await this.dao.save({
        ...request.body,
        vehicle: vehicle,
        directory: null,
      });
      return logAndRespond200(response, one, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  async saveCentral(request: Request, response: Response) {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) {
        return logAndRespond400(
          response,
          400,
          getErrorMessageFromExpressValidatorErrors(errors)
        );
      }
      const { role } = getPayloadFromResponse(response);
      if (role !== Role.ADMIN) {
        return logAndRespond400(
          response,
          401,
          "only admins can use this endpoint"
        );
      }
      const one = await this.dao.save({ ...request.body, vehicle: null });
      return logAndRespond200(response, one, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  async getRSSI(request: Request, response: Response) {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) {
        return logAndRespond400(
          response,
          400,
          getErrorMessageFromExpressValidatorErrors(errors)
        );
      }
      const { trackerId } = request.query;
      const data = await this.dao.getRSSIData(trackerId as string);
      return logAndRespond200(response, data, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  /**
   * @param request
   * @param response
   * @param next
   */
  /*async remove(request: Request, response: Response, next: NextFunction) {
		return response.sendStatus(501)
	}*/
}
