/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response, NextFunction } from "express";
import { app } from "../main";

export const checkModuleEnabled =
  (module: string, moduleShouldBeDisabled?: boolean) =>
  (req: Request, res: Response, next: NextFunction) => {
    const flag =
      (moduleShouldBeDisabled && app.enabledModules.get(module) === "true") ||
      (!moduleShouldBeDisabled && app.enabledModules.get(module) === "false");
    if (flag) {
      console.log(
        "The request at ",
        req.path,
        " cant be served, as checkModuleEnabled ",
        module,
        " ",
        moduleShouldBeDisabled
      );
      res.status(405).send();
      return;
    }
    next();
  };
