/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { dummyLogger } from "./dummy.logger";
import winston from "winston";
import { LOGS_ENABLED, NODE_ENV } from "../config.utils";
import { createProdLogger } from "./prod.logger";
import { createDevLogger } from "./dev.logger";

let logger1: winston.Logger = dummyLogger();
let smsLogger: winston.Logger = dummyLogger();
let wpLogger: winston.Logger = dummyLogger();
let emailLogger: winston.Logger = dummyLogger();

if (NODE_ENV === "dev") {
  // development
  if (LOGS_ENABLED) {
    logger1 = createDevLogger();
    smsLogger = createDevLogger();
    wpLogger = createDevLogger();
    emailLogger = createDevLogger();
  }
} else if (NODE_ENV === "test") {
  // test
} else {
  // production
  logger1 = createProdLogger("logs/info-logs");
  smsLogger = createProdLogger("logs/sms-logs");
  wpLogger = createProdLogger("logs/whatsapp-logs");
  emailLogger = createProdLogger("logs/email-logs");
}

export const logger = logger1;
export const smsSentLogger = smsLogger;
export const whatsappSentLogger = wpLogger;
export const emailSentLogger = emailLogger;
