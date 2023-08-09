/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { sendTelemetry } from "../apis/socket-io/async-browser-comunication";
import { TelemetryDao } from "../daos/telemetry.dao";
import { Telemetry } from "../entities/telemetry";
import * as ServiceTypes from "./_types";
import { handleDaoError } from "./utils/error.utils";

export class TelemetryService {
  private telemetryDao = new TelemetryDao();

  async addTelemetry(username: string, telemetry: Telemetry): Promise<void> {
    try {
      await this.telemetryDao.addTelemetry(username, telemetry);
    } catch (error) {
      throw handleDaoError(error);
    }
    sendTelemetry(telemetry);
  }
}
