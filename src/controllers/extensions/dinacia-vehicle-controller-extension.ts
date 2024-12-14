/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable @typescript-eslint/no-empty-function */
import { IVehicleControllerExtension } from "./extensions-interfaces";
import { DefaultVehicleControllerExtension } from "./default-vehicle-controller-extension";
import { UserDao } from "../../daos/user.dao";
import { Role } from "../../entities/user";
import MailAPIFactory from "../../apis/mail/mail-api-factory";
import {
  generateAuthorizeVehicleMailHTML,
  generateAuthorizeVehicleMailText,
  generateNewVehicleMailHTML,
  generateNewVehicleMailText,
  generateUpdateVehicleMailHTML,
  generateUpdateVehicleMailText,
} from "../../utils/mail-content.utils";

class DinaciaVehicleControllerExtension implements IVehicleControllerExtension {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preProcessUpdateVehicle(_vehicle: unknown) {
    return _vehicle;
  }
  preProcessSaveVehicle(_vehicle: unknown) {
    return _vehicle;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  postVehicleCreation(_vehicle: unknown) {
    console.log("DINACIA::postVehicleCreation::", _vehicle);

    const text = generateNewVehicleMailText(_vehicle);
    const html = generateNewVehicleMailHTML(_vehicle as any);
    this.sendRemoteSensorNotifications(
      "Sensores remotos: Nuevo vehículo",
      text,
      html
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  postVehicleUpdate(_vehicle: unknown) {
    console.log("DINACIA::postVehicleUpdate::", _vehicle);
    const text = generateUpdateVehicleMailText(_vehicle);
    const html = generateUpdateVehicleMailHTML(_vehicle as any);
    this.sendRemoteSensorNotifications(
      "Sensores remotos: Vehículo actualizado",
      text,
      html
    );
  }

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
  ) {
    console.log(
      "DINACIA::postProcessAddDocument::",
      _username,
      _vehicle,
      _document,
      _documentUrl
    );
  }

  async sendRemoteSensorNotifications(
    subject: string,
    textMail: string,
    htmlMail: string
  ) {
    const dao = new UserDao();
    const remoteSensorUsers = await dao.all(
      "",
      "",
      "",
      undefined,
      undefined,
      "role",
      Role.REMOTE_SENSOR,
      false
    );
    const remoteSensorUserEmails = remoteSensorUsers.users.map(
      (user) => user.email
    );
    const mailApi = MailAPIFactory.getMailAPIEnvParams();

    mailApi.sendMail(
      "Dinacia",
      remoteSensorUserEmails,
      subject,
      textMail,
      htmlMail
    );
  }
}

module.exports = DinaciaVehicleControllerExtension;
