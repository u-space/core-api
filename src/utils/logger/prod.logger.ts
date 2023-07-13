/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import winston, { createLogger, format, transports } from "winston";
const { combine, timestamp } = format;

export function createProdLogger(infoLevelFilename: string): winston.Logger {
  return createLogger({
    level: "info",
    format: combine(timestamp(), format.errors({ stack: true }), format.json()),
    transports: [
      new transports.File({
        level: "error",
        filename: "logs/error-logs",
        maxsize: 104857600, // 100Mb
        maxFiles: 3,
      }),
      new transports.File({
        level: "info",
        filename: infoLevelFilename,
        maxsize: 104857600, // 100Mb
        maxFiles: 3,
      }),
    ],
  });
}
