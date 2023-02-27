/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { devLogger } from "./dev.logger";
import { prodLogger } from "./prod.logger";
import { dummyLogger } from "./dummy.logger";
import winston from "winston";

let logger1: winston.Logger = dummyLogger();
if (process.env.NODE_ENV === "dev") {
  // development
  if (process.env.LOGS_ENABLED === "true") {
    logger1 = devLogger;
  }
} else if (process.env.NODE_ENV === "test") {
  // test
} else {
  // production
  logger1 = prodLogger;
}
export const logger = logger1;
