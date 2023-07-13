/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import ISmsApi from "./isms-api";
import SmsApiMock from "./sms-api-mock";
import SmsApiTwilioImp from "./sms-api-twilio-imp";

export default class SmsAPIFactory {
  static getSmsApi(
    mockSmsAPI: boolean,
    twilioAccountSid: string,
    twilioAuthToken: string,
    twilioFromNumber: string
  ): ISmsApi {
    if (mockSmsAPI) return new SmsApiMock();
    else
      return new SmsApiTwilioImp(
        twilioAccountSid,
        twilioAuthToken,
        twilioFromNumber
      );
  }
}
