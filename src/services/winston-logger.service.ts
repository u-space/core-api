/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import winston from "winston";

const { printf } = winston.format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] [${level}]: ${message}`;
});

export const logger = winston.createLogger({
  format: myFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: `${__dirname}/../../logs/logs.log`,
      maxsize: 104857600, // 100 MB
      maxFiles: 5,
    }) /*,
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })*/,
  ],
});

export const logInfo = (message: string) => {
  logger.log({ timestamp: new Date(), level: "info", message: message });
};

export const logDebug = (message: string) => {
  logger.log({ timestamp: new Date(), level: "debug", message: message });
};

export const logError = (message: string, error: Error) => {
  let logText = message;
  if (error !== null) {
    logText += `\n${error.stack}`;
  }
  logger.log({ timestamp: new Date(), level: "error", message: logText });
};

export const logWarning = (message: string) => {
  logger.log({ timestamp: new Date(), level: "warning", message: message });
};
