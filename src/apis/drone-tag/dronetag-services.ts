/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import axios from "axios";
import { PositionController } from "../../controllers/position.controller";
import { logger } from "../../utils/logger/main.logger";
import { point } from "@turf/helpers";

import { connect } from "socket.io-client";

const DRONETAG_API_SERVER_URL = "https://api.dronetag.app";
const DRONETAG_LIVE_API_SERVER_URL = "https://live.dronetag.app";
const DRONETAG_API_KEY = "W7DezabD.k2YBCticRCOUzmuqrKPi3fRk0ujFAw1K";

let positionController: any;
export class DroneTagServices {
  private positionController = new PositionController();
  private axiosInstance = axios.create({
    baseURL: DRONETAG_API_SERVER_URL,
    timeout: 5000,
  });
  private axiosLiveApiInstance = axios.create({
    baseURL: DRONETAG_LIVE_API_SERVER_URL,
    timeout: 5000,
  });

  constructor() {
    console.log("DroneTagServices::Constructor");
  }

  public apiServer = DRONETAG_API_SERVER_URL;
  public liveApiServer = DRONETAG_LIVE_API_SERVER_URL;

  public authUrl = `${this.apiServer}/v1/auth/jwt/token/`;
  public overviewUrl = `${this.liveApiServer}/api/v2/airspace/overview`;

  private API_KEY = `Api-Key ${DRONETAG_API_KEY}`;

  async getToken() {
    const resp = await this.axiosInstance.post(
      this.authUrl,
      {},
      {
        headers: { Authorization: this.API_KEY },
      }
    );
    const jsonResp = await resp.data;
    const token = jsonResp.access;
    return token;
  }

  async processDroneTagTelemetry(droneTagTelemetry: any) {
    const deviceSerialNumber = droneTagTelemetry.uas_id;
    const altitude_gps = droneTagTelemetry.altitude;
    const location = point([
      droneTagTelemetry.location.longitude,
      droneTagTelemetry.location.latitude,
    ]); //create point
    const time_sent = droneTagTelemetry.time; //or time_received
    const heading = 0;
    try {
      await this.positionController.savePositionWithDroneTrackerId(
        deviceSerialNumber,
        altitude_gps,
        location.geometry,
        time_sent,
        heading
      );
    } catch (error) {
      logger.error(error);
    }
  }
  async overview() {
    try {
      const overviewResponse = await this.axiosLiveApiInstance.get(
        this.overviewUrl
      );
      const overview = overviewResponse.data;
      overview.map((droneTagTelemetry: any) =>
        this.processDroneTagTelemetry(droneTagTelemetry)
      );
    } catch (error) {
      logger.error("Error getting Drone Tag positions");
    }
  }
}

export const initSocketIo = async (droneTagSocketIo: any) => {
  console.log("INit socket io dronetag");
  // if (!positionController) {
  // 	console.log('Se crea controller position');
  // 	positionController = new PositionController();
  // }

  const droneTagServer = "https://live.dronetag.app";

  droneTagSocketIo = connect(droneTagServer, {
    path: "/socket.io/v2/",
    rejectUnauthorized: false,
    autoConnect: true,
    transports: ["websocket", "polling"],
  });
  droneTagSocketIo.on("connect_error", (err: any) => {
    console.error(`connect_error due to ${err.message}`);
    droneTagSocketIo.io.opts.transports = ["polling", "websocket"]; // revert to classic upgrade
  });
  droneTagSocketIo.on("telemetry", async (droneTagTelemetryList: any) => {
    console.log("Process telemetry from socketio");
    droneTagTelemetryList.map(async (droneTagTelemetry: any) => {
      const deviceSerialNumber = droneTagTelemetry.uas_id;
      const altitude_gps = droneTagTelemetry.altitude;
      const location = point([
        droneTagTelemetry.location.longitude,
        droneTagTelemetry.location.latitude,
      ]); //create point
      const time_sent = droneTagTelemetry.time; //or time_received
      const heading = 0;
      try {
        if (positionController) {
          await positionController.savePositionWithDroneTrackerId(
            deviceSerialNumber,
            altitude_gps,
            location.geometry,
            time_sent,
            heading
          );
        } else {
          console.log("sin pos controller", droneTagTelemetry);
        }
      } catch (error) {
        console.error(error);
        logger.error(error);
      }
    });
  });
};
