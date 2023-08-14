/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import IWhatsappApi from "./iwhatsapp-api";
import WhatsappApiMock from "./whatsapp-api-mock";
import WhatsappApiTwilioImp from "./whatsapp-api-twilio-imp";

export default class WhatsappAPIFactory {
  static getWhatsappApi(
    mockWhatsappAPI: boolean,
    twilioAccountSid: string,
    twilioAuthToken: string,
    twilioFromNumber: string
  ): IWhatsappApi {
    if (mockWhatsappAPI) return new WhatsappApiMock();
    else
      return new WhatsappApiTwilioImp(
        twilioAccountSid,
        twilioAuthToken,
        twilioFromNumber
      );
  }
}
