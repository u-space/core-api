/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { OperationDao } from "../daos/operation.dao";
import { VehicleDao } from "../daos/vehicle.dao";
import { UserDao } from "../daos/user.dao";

import {
  COMPANY_NAME,
  MOCK_MAIL_API,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_URL,
  SMTP_USERNAME,
} from "../utils/config.utils";

// import { OperationIntersections } from "../entities/OperationIntersection";

import IMailAPI from "../apis/mail/imail-api";
import MailAPIFactory from "../apis/mail/mail-api-factory";
import { DocumentDao } from "../daos/document.dao";
import { Document, ReferencedEntityType } from "../entities/document";
import { addDaysToCurrentDate, daysBetween } from "../utils/date.utils";
import {
  buildExpiredDocumentationHtmlMail,
  buildExpiredDocumentationTextMail,
  buildNextToExpireDocumentHtmlMail,
  buildNextToExpireDocumentTextMail,
} from "../utils/mail-content.utils";
import { VehicleAuthorizeStatus } from "../entities/vehicle-reg";

// list of notifications day befor the expiration
const NOTIFICATION_DAYS = [1000, 60, 30, 10, 1];
const ORDERED_NOTIFICATION_DAYS = NOTIFICATION_DAYS.sort((a, b) => b - a);

let operationDao: OperationDao;
let userDao: UserDao;
let mailAPI: IMailAPI;
let documentDao: DocumentDao;
let vehicleDao: VehicleDao;

export async function processExpiredDocuments() {
  console.log('>>> CRON START: "processExpiredDocuments"');
  documentDao = new DocumentDao();
  vehicleDao = new VehicleDao();
  userDao = new UserDao();

  mailAPI = MailAPIFactory.getMailAPI(
    MOCK_MAIL_API,
    SMTP_URL!,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USERNAME!,
    SMTP_PASSWORD!
  );

  const expiredDocuments = await documentDao.getExpiredDocuments();

  const expiredExpirableDocuments = expiredDocuments

  //change documents to invalid."invalid"
  for (let index = 0; index < expiredExpirableDocuments.length; index++) {
    const document = expiredExpirableDocuments[index];
    document.valid = false;
    console.log(
      `El documento de nombre ${document.id} expiró (${document.valid_until}) `
    );

    const emailToNotify = await getDocumentOwnerEmail(document);

    await documentDao.update(document);
    try {
      if (emailToNotify) {
        if (document.referenced_entity_type === ReferencedEntityType.USER) {
          const user = await userDao.one(emailToNotify);
          user.canOperate = false;
          await userDao.update(user);
        } else if (
          document.referenced_entity_type === ReferencedEntityType.VEHICLE &&
          document.referenced_entity_id
        ) {
          // I commented this code because I think we are going to activate shortly
          /*const vehicle = await vehicleDao.one(document.referenced_entity_id);
          if (document.tag === "remote_sensor_id") {
            vehicle.remoteSensorValid = false;
          } else {
            vehicle.authorized = VehicleAuthorizeStatus.NOT_AUTHORIZED;
          }
          await vehicleDao.updateOnlyReceivedProperties(vehicle);*/
        }
      }
    } catch (e) {
      console.error("Error when update user or vehicle " + emailToNotify);
    }

    if (emailToNotify) {
      mailAPI.sendMail(
        COMPANY_NAME!,
        [emailToNotify],
        "Expiró un documento",
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

  const expirableDocuments = documents.filter(
    (doc) =>
      doc.extra_fields &&
      "expirable" in doc.extra_fields &&
      doc.extra_fields.expirable === false
  );

  const documentsToSendNotifications = [];

  for (let iDoc = 0; iDoc < expirableDocuments.length; iDoc++) {
    const document = expirableDocuments[iDoc];
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
