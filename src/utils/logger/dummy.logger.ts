/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createLogger, format, transports } from "winston";
const { combine, timestamp } = format;

export const dummyLogger = () => {
  const loger = createLogger({
    level: "info",
    format: combine(
      format.colorize(),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true })
    ),
    transports: [new transports.Console()],
  });
  loger.silent = true;
  return loger;
};
