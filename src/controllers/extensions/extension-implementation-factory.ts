/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  USER_CONTROLLER_EXTENSION,
  VEHICLE_CONTROLLER_EXTENSION_ROUTE,
} from "../../utils/config.utils";
import {
  IUserControllerExtension,
  IVehicleControllerExtension,
} from "./extensions-interfaces";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const vehicleControllerExtension = require(VEHICLE_CONTROLLER_EXTENSION_ROUTE!);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const userControllerExtension = require(USER_CONTROLLER_EXTENSION!);

export function GetUserControllerExtension(): IUserControllerExtension {
  return new userControllerExtension();
}

export function GetVehicleControllerExtension(): IVehicleControllerExtension {
  return new vehicleControllerExtension();
}
