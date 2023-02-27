/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
// import { AircraftType } from '../entities/AircraftType';
// import { AircraftType } from '../entities/AircraftType';
import {
  getAircraftType,
  getAircraftTypes,
  saveAircraftType,
} from "./aircraft-type-domain.controller";
import { logAndRespond200, logAndRespond400 } from "./utils";

export class AircraftTypeController {
  async all(request: Request, response: Response) {
    try {
      //TODO
      // const model = request.query.model;
      // const manufacturer = request.query.manufacturer;
      const list = await getAircraftTypes();

      return logAndRespond200(response, list, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  async one(request: Request, response: Response) {
    try {
      const id = request.params.id;
      const one = await getAircraftType(id);
      return logAndRespond200(response, one, []);
    } catch (error) {
      return logAndRespond400(response, 404, null);
    }
  }

  async save(request: Request, response: Response) {
    try {
      // const aircraftTypeToSave: AircraftType = new AircraftType();
      let aircraftTypeToSave: any;
      aircraftTypeToSave.band = request.body.band;
      aircraftTypeToSave.class = request.body.class;
      aircraftTypeToSave.color = request.body.color;
      aircraftTypeToSave.dimension = request.body.dimension;
      aircraftTypeToSave.energy = request.body.energy;
      aircraftTypeToSave.lights = request.body.lights;
      aircraftTypeToSave.load_weight = request.body.load_weight;
      aircraftTypeToSave.manufacturer = request.body.manufacturer;
      aircraftTypeToSave.model = request.body.model;
      aircraftTypeToSave.mtom = request.body.mtom;
      aircraftTypeToSave.pilot = request.body.pilot;
      aircraftTypeToSave.time_autonomy = request.body.time_autonomy;
      aircraftTypeToSave.vhf = request.body.vhf;
      aircraftTypeToSave.visual_front_sensor = request.body.visual_front_sensor;
      const result = await saveAircraftType(aircraftTypeToSave);

      return logAndRespond200(response, result, []);
    } catch (error) {
      console.dir(error);
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
}
