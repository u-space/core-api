/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { schedule } from "node-cron";
import { DroneTagServices } from "../../apis/drone-tag/dronetag-services";
import { processOperations } from "./operation-cronjobs.service";

const DRONETATG_INTEGRATION = true;

export class CronService {
  tasks: any = {};

  constructor() {
    let dts: DroneTagServices;
    if (DRONETATG_INTEGRATION) {
      dts = new DroneTagServices();
    }

    console.log("<>    CRON SERVICE     <>");

    const operationCron = schedule("*/30 * * * * *", function () {
      processOperations();
      // if (DRONETATG_INTEGRATION) {
      // 	dts.overview();
      // }
    });
    operationCron.start();
    this.tasks["operationCron"] = operationCron;

    if (DRONETATG_INTEGRATION) {
      const dronetagCron = schedule("*/5 * * * * *", function () {
        // if (DRONETATG_INTEGRATION) {
        dts.overview();
        // }
      });
      dronetagCron.start();
      this.tasks["dronetagCron"] = dronetagCron;
    }
  }
}
