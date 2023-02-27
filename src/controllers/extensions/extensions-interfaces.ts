/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export interface IUserControllerExtension {
  postProcessRegisterUser(user: any, origin: any): void;
  postProcessAddDocument(user: string, document: any): any;
}

export interface IVehicleControllerExtension {
  preProcessUpdateVehicle(vehicle: any): any;
  preProcessSaveVehicle(vehicle: any): any;
  postVehicleCreation(vehicle: any): any;
  postVehicleUpdate(vehicle: any): any;
  validateVehicleExtraFields(extraFields: unknown): any;
  postProcessAddDocument(
    username: string,
    vehicle: any,
    document: any,
    documentURL: string
  ): any;
}
