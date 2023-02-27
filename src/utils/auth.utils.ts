/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { User } from "../entities/user";
import { logAndRespond } from "../controllers/utils";
import { Response } from "express";

// getUserFields for payload
export function getUserFields(user: User) {
  return {
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

export function getPayloadFromResponse(response: any) {
  return response["locals"].jwtPayload;
}

export function parseErrorAndRespond(res: Response, error: any) {
  const message =
    error &&
    error["response"] &&
    error["response"].data &&
    error["response"].data.message
      ? error["response"].data.message
      : error;
  return logAndRespond(
    res,
    error["response"] && error["response"].status
      ? error["response"].status
      : 500,
    message,
    null,
    "info",
    null,
    ["password"]
  );
}
