/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import nodemailer from "nodemailer";
import IMailAPI from "./imail-api";

export default class MailAPINodemailerImp implements IMailAPI {
  username: string;
  transporter;

  constructor(
    smtpUrl: string,
    smtpPort: number,
    smtpSecure: boolean,
    smtpUsername: string,
    smtpPassword: string
  ) {
    this.username = smtpUsername;
    const transportConfig = {
      host: smtpUrl,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUsername,
        pass: smtpPassword,
      },
      tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false,
      },
    };
    this.transporter = nodemailer.createTransport(transportConfig);
  }

  verifyServer() {
    this.transporter.verify(function (error) {
      if (error) {
        console.log(error);
      } else {
        // console.log("Server is ready to take our messages");
      }
      return error;
    });
  }

  async sendTestMail(): Promise<void> {
    await this.transporter.sendMail({
      from: `"Portable Utm" <${this.username}>`,
      to: "info@dronfies.com",
      subject: "Hello ✔",
      text: "Hello world? 👻",
      html: "<b>Hello world? 👻</b>",
    });
  }

  async sendMail(
    companyName: string,
    to: string[],
    subject: string,
    text: string,
    html: string
  ): Promise<any> {
    const info = await this.transporter.sendMail({
      from: `"UAS | ${companyName}" <${this.username}>`,
      to: to,
      subject: subject,
      text: text,
      html: html,
    });
    return info;
  }
}
