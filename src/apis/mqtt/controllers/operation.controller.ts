/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { OperationDao } from "../../../daos/operation.dao";
import { InvalidDataError, NotFoundError } from "../../../daos/db-errors";
import { getElevation } from "../../../controllers/external-services.controller";
import { getgufiPosition } from "../model/get-gufi-position";
import * as mqtt from "mqtt";
import { getgufiResponse } from "../model/get-gufi-response";
import GeneralUtils from "../../../utils/general.utils";

export class MQTTOperationController {
  private dao: OperationDao;
  private mqttClient: mqtt.Client;

  constructor(mqttClient: mqtt.Client) {
    this.dao = new OperationDao();
    this.mqttClient = mqttClient;
  }

  async activatedOperationByLocation(
    username: string,
    position: getgufiPosition,
    trackerId: string
  ) {
    const responseTopic =
      "getGufi" + "/" + username + "/" + trackerId + "/" + "response";
    const { location, altitude_gps } = position;
    const alt = await getElevation([
      {
        lat: location?.coordinates[1],
        lng: location?.coordinates[0],
      },
    ]);
    //fix altitude to be AGL before asking for operation
    position.altitude = position.altitude_gps! - alt.results[0].elevation;
    let response: getgufiResponse;

    try {
      const operation = await this.dao.getActivatedOperationByPosition(
        location,
        altitude_gps
      );
      // if the user is PILOT, we have to check that he es one of the operators of the operation
      if (
        operation.uas_registrations!.filter(
          (vehicle) =>
            vehicle.operators!.filter(
              (operator) => operator.username === username
            ).length > 0
        ).length === 0
      ) {
        response = {
          status: "error",
          message: `There is no operation ACTIVATED in the location received (location=${JSON.stringify(
            location
          )}, altitude_gps=${altitude_gps})`,
        };
      }
      const gufi = operation.gufi;

      response = {
        status: "ok",
        gufi: gufi,
        altitude: alt.results[0].elevation,
      };

      this.mqttClient.publish(responseTopic, JSON.stringify(response));
    } catch (error) {
      let response: getgufiResponse;
      if (error instanceof InvalidDataError) {
        response = { status: "error", message: error.message };
      } else if (error instanceof NotFoundError) {
        response = {
          status: "error",
          message: `There is no operation ACTIVATED in the location received (location=${JSON.stringify(
            location
          )}, altitude_gps=${altitude_gps})`,
        };
      } else {
        response = {
          status: "error",
          message: GeneralUtils.getErrorMessage(error),
        };
      }
      this.mqttClient.publish(responseTopic, JSON.stringify(response));
    }
  }
}
