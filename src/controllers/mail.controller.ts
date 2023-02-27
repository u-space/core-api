/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { OperationDao } from "../daos/operation.dao";
import { Role } from "../entities/user";
import { getPayloadFromResponse } from "../utils/auth.utils";
import {
  operationMailHtml,
  makeBodyForPendingOpeartionMailText,
  makeBodyForPendingOperationMailHtml,
  makeNotAcceptedMailText,
  makeNotAcceptedMailHtml,
} from "../utils/mail-content.utils";
import { UASVolumeReservationDao } from "../daos/uas-volume-reservation.dao";
import { RestrictedFlightVolumeDao } from "../daos/restricted-flight-volume.dao";
import { Operation } from "../entities/operation";
import { logInfo } from "../services/winston-logger.service";
import { logAndRespond200, logAndRespond400 } from "./utils";
import IMailAPI from "../apis/mail/imail-api";
import MailAPIFactory from "../apis/mail/mail-api-factory";
import {
  COMPANY_NAME,
  MOCK_MAIL_API,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_URL,
  SMTP_USERNAME,
} from "../utils/config.utils";

export class MailController {
  private dao = new OperationDao();
  private mailAPI: IMailAPI = MailAPIFactory.getMailAPI(
    MOCK_MAIL_API,
    SMTP_URL!,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USERNAME!,
    SMTP_PASSWORD!
  );

  /**
   * Send a mail to receiverMail, with the content of bodyMail and the informatio of the operation with gufi
   * @example POST /mail/pending mailData = { receiverMail: receiverMail, gufi: gufi, bodyMail: "La operació... "}
   * @param request
   * @param response
   * @param next
   */
  async sendMailForPendingOperation(request: Request, response: Response) {
    const { role } = getPayloadFromResponse(response);
    const { receiverMail, gufi, bodyMail } = request.body;
    // console.log(` ---> SEND-MAIL-FOR-PENDING-OPERATION:${JSON.stringify(request.body)}`)

    try {
      // let error = false

      const error = await doSendMailForPendingOperation(
        this.dao,
        this.mailAPI,
        { receiverMail, gufi, bodyMail },
        { role }
      );
      if (error) {
        return logAndRespond400(response, 401, null);
      } else {
        return logAndRespond200(response, { status: "ok" }, []);
      }
    } catch (error) {
      // console.error(error)
      return logAndRespond400(response, 400, null);
    }
  }

  async sendOperationMail(request: Request, response: Response) {
    const { receiverMail, gufi, bodyMail } = request.body;
    try {
      const error = await doSendMailForOperation(this.dao, this.mailAPI, {
        receiverMail,
        gufi,
        bodyMail,
      });
      if (error) {
        return logAndRespond400(response, 401, null);
      } else {
        return logAndRespond200(response, { status: "ok" }, []);
      }
    } catch (error) {
      // console.error(error)
      return logAndRespond400(response, 400, null);
    }
  }
}

export const doSendMailForPendingOperation = async (
  dao: OperationDao,
  mailAPI: any,
  { receiverMail, gufi, bodyMail }: any,
  { role }: any
) => {
  if (role == Role.ADMIN) {
    const operation = <Operation>await dao.one(gufi);

    let rfvs: any = [];
    const rfvDao = new RestrictedFlightVolumeDao();
    for (let index = 0; index < operation.operation_volumes.length; index++) {
      const operationVolume = operation.operation_volumes[index];
      rfvs = rfvs.concat(await rfvDao.getRfvIntersections(operationVolume));
    }
    logInfo(
      `Operation ${operation.gufi} intersect with rfs: ${JSON.stringify(
        rfvs.map((rfv: any) => rfv.id)
      )}`
    );

    const rfvMsg = JSON.stringify(rfvs);
    const subject =
      "Información sobre operación de dron que entro en estado pendiente";
    const body = makeBodyForPendingOpeartionMailText(
      bodyMail,
      operation,
      rfvMsg,
      rfvs
    );
    const htmlBody = makeBodyForPendingOperationMailHtml(
      bodyMail,
      operation,
      rfvMsg,
      rfvs
    );

    mailAPI.sendMail(receiverMail, subject, body, htmlBody).catch(() => {
      console.error("Email was not send");
    });
    return false;
  } else {
    return true;
  }
};

export const doSendMailForOperation = async (
  dao: OperationDao,
  mailAPI: IMailAPI,
  { receiverMail, gufi, bodyMail }: any
) => {
  // TODO: Implement in PER INSTANCE configuration - pilots sending emails for no reason is BAD.
  //if (role == Role.ADMIN) {
  const operation = <Operation>await dao.one(gufi);

  const subject = "Información sobre operación";

  const htmlBody = ` <p>${bodyMail}</p>
    ${operationMailHtml(operation)}`;

  mailAPI
    .sendMail(COMPANY_NAME!, receiverMail, subject, htmlBody, htmlBody)
    .catch(() => {
      console.error("Email was not send");
    });
  return false;
  /*} else {
    return true
  }*/
};

export const doSendMailForNotAcceptedOperation = async (
  dao: any,
  mailAPI: IMailAPI,
  { receiverMail, gufi, bodyMail }: any,
  { role }: any
) => {
  if (role == Role.ADMIN) {
    const operation = <Operation>await dao.one(gufi);
    const uvrDao = new UASVolumeReservationDao();

    let uvrs: any = [];
    let operations: any = [];
    for (let index = 0; index < operation.operation_volumes.length; index++) {
      const operationVolume = operation.operation_volumes[index];
      operations = operations.concat(
        await dao.getOperationVolumeByVolumeCountExcludingOneOperation(
          operation.gufi,
          operationVolume
        )
      ); //FIXME it can get only the operation
      uvrs = uvrs.concat(await uvrDao.getUvrIntersections(operationVolume));
    }

    logInfo(
      `Operation ${operation.gufi} intersect with operations: ${JSON.stringify(
        operations.map((op: any) => op.gufi)
      )} and with UVRs: ${JSON.stringify(
        uvrs.map((uvr: any) => uvr.message_id)
      )} `
    );

    const subject =
      "Información sobre operación de dron que entro en estado no aceptado";
    const body = makeNotAcceptedMailText(bodyMail, operation, operations, uvrs);
    const htmlBody = makeNotAcceptedMailHtml(
      bodyMail,
      operation,
      operations,
      uvrs
    );

    mailAPI
      .sendMail(COMPANY_NAME!, receiverMail, subject, body, htmlBody)
      .catch(() => {
        console.error("Email was not send");
      });
    return false;
  } else {
    return true;
  }
};
