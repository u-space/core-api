/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as jwt from "jsonwebtoken";
import { jwtSecret, jwtExpTime } from "../config.utils";

export function getToken(email: any, username: any, role: any) {
  const newToken = jwt.sign({ email, username, role }, jwtSecret, {
    expiresIn: jwtExpTime,
  });
  return newToken;
}
