/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createLogger, format, transports } from "winston";
const { combine, timestamp, printf } = format;

const customFormat = printf((info) => {
  const infoKeys = Object.keys(info);
  const metadata: any = {};
  for (let i = 0; i < infoKeys.length; i++) {
    const key = infoKeys[i];
    if (key !== "level" && key !== "message" && key !== "timestamp") {
      metadata[key] = info[key];
    }
  }
  const { timestamp, level, stack, message } = info;
  return `[${timestamp}] ${level}: ${
    stack || message
  }\nmetadata: ${JSON.stringify(metadata)}\n`;
});

export const devLogger = createLogger({
  level: "info",
  format: combine(
    format.colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    customFormat
  ),
  transports: [new transports.Console()],
});
