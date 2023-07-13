/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { smsSentLogger } from "../../utils/logger/main.logger";
import ISmsApi from "./isms-api";
import { Twilio } from "twilio";

export default class SmsApiTwilioImp implements ISmsApi {
  private client: Twilio;
  private from: string;

  constructor(accountSid: string, authToken: string, from: string) {
    this.client = new Twilio(accountSid, authToken);
    this.from = from;
  }

  async sendSms(to: string, message: string): Promise<any> {
    const twilioResponse = await this.client.messages.create({
      body: message,
      from: this.from,
      to,
    });
    smsSentLogger.info("SMS Sent", { twilioResponse });
    return twilioResponse;
  }
}
