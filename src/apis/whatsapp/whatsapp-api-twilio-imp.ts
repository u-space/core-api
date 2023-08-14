/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { whatsappSentLogger } from "../../utils/logger/main.logger";
import IWhatsappApi from "./iwhatsapp-api";
import { Twilio } from "twilio";

export default class WhatsappApiTwilioImp implements IWhatsappApi {
  private client: Twilio;
  private from: string;

  constructor(accountSid: string, authToken: string, from: string) {
    this.client = new Twilio(accountSid, authToken);
    this.from = from;
  }

  async sendMessage(to: string, message: string): Promise<any> {
    const twilioResponse = await this.client.messages.create({
      body: message,
      from: `whatsapp:${this.from}`,
      to: `whatsapp:${to}`,
    });
    whatsappSentLogger.info("Whatsapp Sent", { twilioResponse });
    return twilioResponse;
  }
}
