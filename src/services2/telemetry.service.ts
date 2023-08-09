/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { sendTelemetry } from "../apis/socket-io/async-browser-comunication";
import { TelemetryDao } from "../daos/telemetry.dao";
import { Telemetry } from "../entities/telemetry";

export class TelemetryService {
  private telemetryDao = new TelemetryDao();

  async addTelemetry(username: string, telemetry: Telemetry): Promise<void> {
    await this.telemetryDao.addTelemetry(username, telemetry);
    sendTelemetry(telemetry);
  }
}
