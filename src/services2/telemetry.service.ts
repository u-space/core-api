/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { sendTelemetry } from "../apis/socket-io/async-browser-comunication";
import { getElevation2 } from "../controllers/external-services.controller";
import { TelemetryDao } from "../daos/telemetry.dao";
import { Telemetry } from "../entities/telemetry";
import { handleDaoError } from "./utils/error.utils";

export class TelemetryService {
  private telemetryDao = new TelemetryDao();

  async addTelemetry(
    username: string,
    telemetry: Telemetry
  ): Promise<Telemetry> {
    // Calculate telemetry extra data
    if (telemetry.altitudeAbs) {
      try {
        const elevation = await getElevation2(telemetry.lat, telemetry.lon);
        telemetry.calculatedData = {
          groundElevationInMeters: elevation.elevation,
          elevationProviderAPI: elevation.provider,
          altitudeAGLInMeters: Math.max(
            0,
            telemetry.altitudeAbs - Math.max(0, elevation.elevation)
          ),
        };
        console.log(telemetry);
      } catch (error) {
        /* empty */
      }
    }

    // Add telemetry to the database
    try {
      telemetry.id = await this.telemetryDao.addTelemetry(username, telemetry);
    } catch (error) {
      throw handleDaoError(error);
    }

    // Send telemetry via socket.io
    sendTelemetry(telemetry);

    // return result
    return telemetry;
  }
}
