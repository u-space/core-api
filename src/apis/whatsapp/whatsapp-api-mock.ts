/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import IWhatsappApi from "./iwhatsapp-api";

export default class WhatsappApiMock implements IWhatsappApi {
  async sendTemplate(
    to: string,
    contentSid: string,
    variables: Record<string, string>
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): Promise<any> {}
}
