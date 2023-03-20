/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// var moment = require('moment-timezone');
import moment from "moment-timezone";
const localTimeZone = "America/Montevideo";

export function getLocalTime(timeUTC: any) {
  return moment.tz(timeUTC, localTimeZone).toLocaleString();
}

// expected format: 'YYYY-MM-DDTHH:MM:SSZ'
// example: '2022-01-31T13:02:38Z'
export function isUTCDatetime(datetime: string) {
  if (!datetime.endsWith("Z")) return false;
  return moment(datetime, moment.ISO_8601, true).isValid();
}

// return the following format: 'YYYY-MM-DD HH:MM:SS.SSS'
// example: '2022-01-31 13:02:38.223'
export function formatDate(datetime: Date): string {
  const date = new Date(datetime);
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  const hours = ("0" + date.getHours()).slice(-2);
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const seconds = ("0" + date.getSeconds()).slice(-2);
  const milliseconds = ("00" + date.getMilliseconds()).slice(-3);

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}
