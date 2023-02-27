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
