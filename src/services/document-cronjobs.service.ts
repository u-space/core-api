/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { OperationDao } from "../daos/operation.dao";
import { VehicleDao } from "../daos/vehicle.dao";

import {
  adminEmail,
  COMPANY_NAME,
  MOCK_MAIL_API,
  OPERATION_DEFAULT_STATE,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_URL,
  SMTP_USERNAME,
  STRATEGIC_DECONFLICT_MODE_DISABLED,
} from "../utils/config.utils";
import { logError } from "./winston-logger.service";

// import { OperationIntersections } from "../entities/OperationIntersection";
import { Role } from "../entities/user";

import { doSendMailForPendingOperation } from "../controllers/mail.controller";
import {
  buildExpiredDocumentationHtmlMail,
  buildExpiredDocumentationTextMail,
  buildNextToExpireDocumentHtmlMail,
  buildNextToExpireDocumentTextMail,
  operationMailHtml,
} from "../utils/mail-content.utils";
import { logStateChange } from "../controllers/utils";
import MailAPIFactory from "../apis/mail/mail-api-factory";
import IMailAPI from "../apis/mail/imail-api";
import { DocumentDao } from "../daos/document.dao";
import { addDaysToCurrentDate, daysBetween } from "../utils/date.utils";
import { Document, ReferencedEntityType } from "../entities/document";

// list of notifications day befor the expiration
const NOTIFICATION_DAYS = [1000, 60, 30, 10, 1];
const ORDERED_NOTIFICATION_DAYS = NOTIFICATION_DAYS.sort((a, b) => b - a);

let operationDao: OperationDao;
let mailAPI: IMailAPI;
let documentDao: DocumentDao;
let vehicleDao: VehicleDao;

export async function processExpiredDocuments() {
  console.log('>>> CRON START: "processExpiredDocuments"');
  documentDao = new DocumentDao();
  vehicleDao = new VehicleDao();

  mailAPI = MailAPIFactory.getMailAPI(
    MOCK_MAIL_API,
    SMTP_URL!,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USERNAME!,
    SMTP_PASSWORD!
  );

  const expiredDocuments = await documentDao.getExpiredDocuments();
  //change documents to invalid."invalid"
  for (let index = 0; index < expiredDocuments.length; index++) {
    const document = expiredDocuments[index];
    document.valid = false;
    console.log(
      `El documento de nombre ${document.id} expiró (${document.valid_until}) `
    );

    const emailToNotify = await getDocumentOwnerEmail(document);

    await documentDao.update(document);

    if (emailToNotify) {
      mailAPI.sendMail(
        COMPANY_NAME!,
        [emailToNotify],
        "Document expired",
        buildExpiredDocumentationTextMail(
          emailToNotify,
          document,
          COMPANY_NAME!
        ),
        buildExpiredDocumentationHtmlMail(
          emailToNotify,
          document,
          COMPANY_NAME!
        )
      );
    }
  }
}

async function getDocumentOwnerEmail(document: Document) {
  let emailToNotify;
  if (
    document.referenced_entity_type === ReferencedEntityType.VEHICLE &&
    document.referenced_entity_id
  ) {
    const vehicle = await vehicleDao.one(document.referenced_entity_id);
    emailToNotify = vehicle.owner?.email;
  } else if (document.referenced_entity_type === ReferencedEntityType.USER) {
    emailToNotify = document.referenced_entity_id;
  }
  return emailToNotify;
}

export async function processNextToExpireDocuments() {
  console.log('>>> CRON START: "processNotifiacations"');
  documentDao = new DocumentDao();

  const biggestDay = ORDERED_NOTIFICATION_DAYS[0];
  const biggestDate = addDaysToCurrentDate(biggestDay);

  const documents = await documentDao.getNextoToExpireDocuments(biggestDate);

  // documents.forEach((document) => {
  //   console.log(
  //     `El documento ${document.id} expira en ${daysBetween(
  //       document.valid_until ? document.valid_until : new Date().toISOString()
  //     )} ${document.valid_until}`
  //   );
  // });

  const documentsToSendNotifications = [];

  for (let iDoc = 0; iDoc < documents.length; iDoc++) {
    const document = documents[iDoc];
    const validUntil = new Date(
      document.valid_until || new Date().toISOString()
    );
    let updateDoc = false;
    console.log("*****************************");
    console.log(
      `El documento ${document.id} expira en ${daysBetween(
        document.valid_until ? document.valid_until : new Date().toISOString()
      )} dias ${document.valid_until}`
    );
    // itero sobre los dias a enviar notificaciones, si no mando a los 30, tampoco debería mandar a los 15
    for (let iDay = 0; iDay < ORDERED_NOTIFICATION_DAYS.length; iDay++) {
      const day = ORDERED_NOTIFICATION_DAYS[iDay];
      const dateToCheck = addDaysToCurrentDate(day);
      if (validUntil < dateToCheck) {
        console.log(
          `check: ${day} -> El documento ${document.id} expira en menos de ${day} ${document.valid_until}`
        );
        if (document.notifications && !document.notifications[day]) {
          document.setNotificationSended(day);
          documentsToSendNotifications.push({ document, day });
          updateDoc = true;
        } else {
          console.log(
            `El documento ${document.id} ya fue notificado por ${day} dias`
          );
        }
      } else {
        console.log(`El documento ${document.id} expira en mas de ${day}`);
        break;
      }
    }

    if (updateDoc) {
      console.log("Document to update: ", document);
      await documentDao.update(document);
    }
    console.log("*****************************");
  }

  documentsToSendNotifications.forEach(({ document, day }) => {
    sendNextToExpireDocumentsEmail(document, day);
  });
}

const sendNextToExpireDocumentsEmail = async (
  document: Document,
  day: number
) => {
  const emailToNotify = await getDocumentOwnerEmail(document);

  if (emailToNotify) {
    mailAPI.sendMail(
      COMPANY_NAME!,
      [emailToNotify],
      `Tienes un documento que vence en menos de ${day} días`,
      buildNextToExpireDocumentTextMail(
        emailToNotify,
        document,
        day,
        COMPANY_NAME!
      ),
      buildNextToExpireDocumentHtmlMail(
        emailToNotify,
        document,
        day,
        COMPANY_NAME!
      )
    );
  }
};

// logError(
//   `Error on operation: ${
//     operation ? operation.gufi : "Operation sin GUFI"
//   }\n${error}`,
//   new Error()
// );
