/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable @typescript-eslint/no-empty-function */
import { IVehicleControllerExtension } from "./extensions-interfaces";

class DefaultVehicleControllerExtension implements IVehicleControllerExtension {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preProcessUpdateVehicle(_vehicle: unknown) {}
  preProcessSaveVehicle(_vehicle: unknown) {
    return _vehicle;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  postVehicleCreation(_vehicle: unknown) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  postVehicleUpdate(_vehicle: unknown) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateVehicleExtraFields(_extraFields: unknown) {}
  postProcessAddDocument(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _username: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _vehicle: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _document: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _documentUrl: string
  ) {}
}

module.exports = DefaultVehicleControllerExtension;
