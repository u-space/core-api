/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import IMailAPI from "./imail-api";
import MailAPIMock from "./mail-api-mock";
import MailAPINodemailerImp from "./mail-api-nodemailer-imp";

export default class MailAPIFactory {
  static getMailAPI(
    mockMailAPI: boolean,
    smtpUrl: string,
    smtpPort: number,
    smtpSecure: boolean,
    smtpUsername: string,
    smtpPassword: string
  ): IMailAPI {
    if (mockMailAPI) return new MailAPIMock();
    else
      return new MailAPINodemailerImp(
        smtpUrl,
        smtpPort,
        smtpSecure,
        smtpUsername,
        smtpPassword
      );
  }
}
