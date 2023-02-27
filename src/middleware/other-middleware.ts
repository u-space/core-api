/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response, NextFunction } from "express";
import { getPayloadFromResponse } from "../utils/auth.utils";
import { Role } from "../entities/user";
import { logAndRespond400 } from "../controllers/utils";

export const isAdminUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { role } = getPayloadFromResponse(res);
  if (role !== Role.ADMIN) {
    return logAndRespond400(res, 403, null);
  }

  //Call the next middleware or controller
  next();
};

export const isAdminOrPilotUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { role } = getPayloadFromResponse(res);
  if (role !== Role.ADMIN && role !== Role.PILOT) {
    return logAndRespond400(res, 403, null);
  }

  //Call the next middleware or controller
  next();
};
