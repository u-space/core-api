/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NODE_ENV } from "../utils/config.utils";

let fakeDate = new Date("2019-12-11T13:59:10.000Z");

// export function getNow() {
//     return new Date();
// }

export function fakeTime(newDate: string): Date {
  fakeDate = new Date(newDate);
  return fakeDate;
}

export let getNow: any;

if (NODE_ENV != "test") {
  getNow = function () {
    return new Date();
  };
} else {
  getNow = function () {
    return fakeDate;
  };
}
