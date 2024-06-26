/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createLogger, format, transports } from "winston";
const { combine, timestamp, printf } = format;

const colors = {
  Reset: "\x1b[0m",
  FgBlue: "\x1b[34m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",
};

function colorizeKeys(obj: any, depth = 0) {
  if (typeof obj !== "object" || obj === null) {
    return JSON.stringify(obj);
  }

  const indent = "  ".repeat(depth);
  const braceIndent = depth > 0 ? "  ".repeat(depth - 1) : "";
  const isArray = Array.isArray(obj);
  let result = isArray ? "[\n" : "{\n";

  for (const [key, value] of Object.entries(obj)) {
    const formattedKey = isArray
      ? ""
      : `${colors.Bright}"${key}"${colors.Reset}: `;
    const formattedValue = colorizeKeys(value, depth + 1);
    result += `${indent}${formattedKey}${formattedValue},\n`;
  }

  result = result.slice(0, -2) + "\n"; // Remove the last comma and add a newline
  result += isArray ? `${braceIndent}]` : `${braceIndent}}`;
  return result;
}

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
  console.log(level);
  return `[${timestamp}] ${level}: ${stack || message}\n${colorizeKeys(
    metadata,
    0
  )}\n`;
});

export function createDevLogger() {
  return createLogger({
    level: "info",
    format: combine(
      format.colorize(),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true }),
      customFormat
    ),
    transports: [new transports.Console()],
  });
}
