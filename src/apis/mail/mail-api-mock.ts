/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import IMailAPI from "./imail-api";

export default class MailAPIMock implements IMailAPI {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  verifyServer() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  sendTestMail() {}
  async sendMail(
    companyName: string,
    to: string[],
    subject: string,
    text: string,
    html: string
  ): Promise<any> {
    return Promise.resolve();
  }
}
