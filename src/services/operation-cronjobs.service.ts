/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { OperationDao } from "../daos/operation.dao";
import { Operation, OperationState } from "../entities/operation";
import { getNow } from "./datetime.service";
import { OperationVolume } from "../entities/operation-volume";
import { UASVolumeReservationDao } from "../daos/uas-volume-reservation.dao";
import { RestrictedFlightVolumeDao } from "../daos/restricted-flight-volume.dao";
import {
  sendOperationStateChange,
  sendUpdateOperation,
} from "../apis/socket-io/async-browser-comunication";
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
import { operationMailHtml } from "../utils/mail-content.utils";
import { logStateChange } from "../controllers/utils";
import MailAPIFactory from "../apis/mail/mail-api-factory";
import IMailAPI from "../apis/mail/imail-api";

let operationDao: OperationDao;
let uvrDao: UASVolumeReservationDao;
let rfvDao: RestrictedFlightVolumeDao;
let mailAPI: IMailAPI;

export async function processOperations() {
  console.log('>>> CRON START: "processOperations"');
  operationDao = new OperationDao();
  uvrDao = new UASVolumeReservationDao();
  rfvDao = new RestrictedFlightVolumeDao();
  mailAPI = MailAPIFactory.getMailAPI(
    MOCK_MAIL_API,
    SMTP_URL!,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USERNAME!,
    SMTP_PASSWORD!
  );

  const operations = await operationDao.getOperationsForCron();
  for (let index = 0; index < operations.length; index++) {
    const operation: Operation = operations[index];

    try {
      switch (operation.state) {
        case OperationState.PROPOSED:
          processProposed(operation);
          break;
        case OperationState.ACCEPTED:
          processAccepted(operation);
          break;
        case OperationState.ACTIVATED:
          processActivated(operation);
          break;
        case OperationState.ROGUE:
          processRouge(operation);
          break;
        case OperationState.PENDING:
          processPending(operation);
          break;
        default:
          break;
      }
    } catch (error) {
      errorOnOperation(
        operation,
        "processOperations: " + JSON.stringify(error)
      );
    }
  }
}

/**
 * If a operation is proposed we need to check ir intersects with an other operation volume or uvr
 * @param operation
 */
async function processProposed(operation: Operation): Promise<void> {
  try {
    if (!STRATEGIC_DECONFLICT_MODE_DISABLED) {
      for (let index = 0; index < operation.operation_volumes.length; index++) {
        const operationVolume = operation.operation_volumes[index];

        const intersect = await checkIntersection(operation, operationVolume);

        if (intersect) {
          await changeState(
            operation,
            OperationState.PENDING,
            "pending because of intersection with other operation"
          );
          doSendMailForPendingOperation(
            operationDao,
            mailAPI,
            {
              receiverMail: operation.owner
                ? operation.owner.email
                : adminEmail,
              gufi: operation.gufi,
              bodyMail: `La operación ${operation.gufi} está pendiente de aprobación.`,
            },
            { role: Role.ADMIN }
          );
          return;
        }
        let changeToPending = false;
        let reason = "";
        if (
          await intersectsWithRestrictedFlightVolume(operation, operationVolume)
        ) {
          changeToPending = true;
          reason = `Intersect with a RFV. ${reason}`;
        }

        if (changeToPending) {
          operation.flight_comments = `${reason}\n${operation.flight_comments}`;
          operationDao = new OperationDao();
          await changeState(operation, OperationState.PENDING, reason);
          doSendMailForPendingOperation(
            operationDao,
            mailAPI,
            {
              receiverMail: operation.owner
                ? operation.owner.email
                : adminEmail,
              gufi: operation.gufi,
              bodyMail: `La operación ${operation.gufi} está pendiente de aprobación.`,
            },
            { role: Role.ADMIN }
          );
          return;
        }
      }
    }

    if (OPERATION_DEFAULT_STATE === OperationState.ACCEPTED) {
      await changeState(
        operation,
        OperationState.ACCEPTED,
        "accepted by cronjob"
      );
      processAccepted(operation);
    } else {
      await changeState(
        operation,
        OperationState.PENDING,
        "pending by cronjob"
      );
    }
  } catch (error) {
    errorOnOperation(operation, JSON.stringify(error));
  }
}

async function checkIntersection(
  operation: Operation,
  operationVolume: OperationVolume
) {
  try {
    const operationsCount = await operationDao.intersectingVolumesCount(
      operationVolume,
      undefined,
      operation.gufi
    );
    const uvrCount = await uvrDao.intersectingUvrsCount(operationVolume);
    let msg = "";
    if (operationsCount > 0 || uvrCount > 0) {
      msg = "Operation overlaps: ";
      if (operationsCount > 0) {
        msg += `${operationsCount} operation(s)`;
        if (uvrCount > 0) {
          msg += ", ";
        }
      }
      if (uvrCount > 0) {
        msg += `${uvrCount} UVR(s)`;
      }
    }
    operation.flight_comments = `${msg}\n\n\n${operation.flight_comments}`;

    return operationsCount > 0 || uvrCount > 0;
  } catch (e) {
    console.log(e);
    return true; //TODO throw exception
  }
}

async function intersectsWithRestrictedFlightVolume(
  operation: Operation,
  operationVolume: OperationVolume
) {
  // let rfvCount = await rfvDao.countRfvIntersections(operationVolume)
  // // if(rfvCount > 0) console.log(`****>>${rfvCount}::${operation.gufi}->${JSON.stringify(operationVolume.operation_geography)}`)
  // return (rfvCount > 0);
  const rfvs = await rfvDao.getRfvIntersections(operationVolume);
  return rfvs.length > 0;
}

// async function isExpiredDinaciaUserPermitExpireDateWhenFly(operation: Operation) {
// 	// let userDao = new UserDao()
// 	// userDao.one(operation.owner.username)

// 	// let permit_expire_date = operation.owner.dinacia_user.permit_expire_date
// 	const isExpiredWhenFly = false;
// 	//!TODO:
// 	// if (operation.owner.dinacia_user && operation.owner.dinacia_user.permit_expire_date) {
// 	//     let permit_expire_date = new Date(operation.owner.dinacia_user.permit_expire_date)

// 	//     if (permit_expire_date != undefined) {
// 	//         for (let index = 0; index < operation.operation_volumes.length; index++) {
// 	//             const element = operation.operation_volumes[index];
// 	//             let effective_time_end_date = new Date(element.effective_time_end)

// 	//             isExpiredWhenFly = isExpiredWhenFly || (effective_time_end_date.getTime() > permit_expire_date.getTime())
// 	//         }
// 	//     }
// 	// } else {
// 	//     isExpiredWhenFly = true
// 	// }

// 	// console.log(`checkDinaciaUserPermitExpireDate::isExpiredWhenFly=${isExpiredWhenFly}`)
// 	return isExpiredWhenFly;
// }

/**
 * If poperation is accepted and it's time to start operation change state to activated
 * @param operation
 */
function processAccepted(operation: Operation) {
  try {
    const date = getNow();

    //gets the volume with earliest effective_time_begin
    const operationVolume = operation.operation_volumes.reduce((a, b) => {
      return new Date(a.effective_time_begin) < new Date(b.effective_time_begin)
        ? a
        : b;
    }, operation.operation_volumes[0]);

    //gets the volume with latest effective_time_end
    const operationVolumeEnd = operation.operation_volumes.reduce((a, b) => {
      return new Date(a.effective_time_end) > new Date(b.effective_time_end)
        ? a
        : b;
    }, operation.operation_volumes[0]);

    const dateBegin = new Date(operationVolume.effective_time_begin);
    const dateEnd = new Date(operationVolumeEnd.effective_time_end);
    if (
      date.getTime() >= dateBegin.getTime() &&
      date.getTime() < dateEnd.getTime()
    ) {
      changeState(
        operation,
        OperationState.ACTIVATED,
        "activated because of time"
      );
    }
    if (date.getTime() > dateEnd.getTime()) {
      changeState(operation, OperationState.CLOSED, "closed because of time");
    }
  } catch (error) {
    errorOnOperation(operation, JSON.stringify(error));
  }
}

/**
 * The operation must be activated until the time then will change to close
 * @param operation
 */
function processActivated(operation: Operation) {
  try {
    const date = getNow();
    // //gets the volume with earliest effective_time_begin
    // // const operationVolume = operation.operation_volumes.reduce((a, b) => {
    //   return new Date(a.effective_time_begin) < new Date(b.effective_time_begin) ? a : b;
    // }
    //   , operation.operation_volumes[0]);

    //gets the volume with latest effective_time_end
    const operationVolumeEnd = operation.operation_volumes.reduce((a, b) => {
      return new Date(a.effective_time_end) > new Date(b.effective_time_end)
        ? a
        : b;
    }, operation.operation_volumes[0]);
    const dateEnd = new Date(operationVolumeEnd.effective_time_end);
    if (date.getTime() > dateEnd.getTime()) {
      changeState(operation, OperationState.CLOSED, "closed because of time");
    }
    // for (let index = 0; index < operation.operation_volumes.length; index++) {
    // 	const operationVolume = operation.operation_volumes[index];
    // 	// const dateBegin = new Date(operationVolume.effective_time_begin);
    // 	const dateEnd = new Date(operationVolume.effective_time_end);
    // 	if (date.getTime() > dateEnd.getTime()) {
    // 		changeState(operation, OperationState.CLOSED);
    // 	}
    // }
  } catch (error) {
    errorOnOperation(operation, JSON.stringify(error));
  }
}

/**
 * The operation must be rouge until the time of end, then will change to close
 * @param operation
 */
function processRouge(operation: Operation) {
  try {
    const date = getNow();

    //gets the volume with latest effective_time_end
    const operationVolumeEnd = operation.operation_volumes.reduce((a, b) => {
      return new Date(a.effective_time_end) > new Date(b.effective_time_end)
        ? a
        : b;
    }, operation.operation_volumes[0]);

    const dateEnd = new Date(operationVolumeEnd.effective_time_end);
    if (date.getTime() > dateEnd.getTime()) {
      changeState(operation, OperationState.CLOSED, "closed because of time");
    }

    // for (let index = 0; index < operation.operation_volumes.length; index++) {
    // 	const operationVolume = operation.operation_volumes[index];
    // 	// const dateBegin = new Date(operationVolume.effective_time_begin);
    // 	const dateEnd = new Date(operationVolume.effective_time_end);
    // 	if (date.getTime() > dateEnd.getTime()) {
    // 		changeState(operation, OperationState.CLOSED);
    // 	}
    // }
  } catch (error) {
    errorOnOperation(operation, JSON.stringify(error));
  }
}

function processPending(operation: Operation) {
  try {
    const date = getNow();
    // //gets the volume with earliest effective_time_begin
    // // const operationVolume = operation.operation_volumes.reduce((a, b) => {
    //   return new Date(a.effective_time_begin) < new Date(b.effective_time_begin) ? a : b;
    // }
    //   , operation.operation_volumes[0]);

    //gets the volume with latest effective_time_end
    const operationVolumeEnd = operation.operation_volumes.reduce((a, b) => {
      return new Date(a.effective_time_end) > new Date(b.effective_time_end)
        ? a
        : b;
    }, operation.operation_volumes[0]);

    if (
      date.getTime() > new Date(operationVolumeEnd.effective_time_end).getTime()
    ) {
      changeState(operation, OperationState.CLOSED, "Closed because of time");
    }
    // for (let index = 0; index < operation.operation_volumes.length; index++) {
    // 	const operationVolume = operation.operation_volumes[index];
    // 	// const dateBegin = new Date(operationVolume.effective_time_begin);
    // 	const dateEnd = new Date(operationVolume.effective_time_end);
    // 	if (date.getTime() > dateEnd.getTime()) {
    // 		changeState(operation, OperationState.CLOSED);
    // 	}
    // }
  } catch (error) {
    errorOnOperation(operation, JSON.stringify(error));
  }
}

async function errorOnOperation(operation: any, error: string) {
  // console.error(`Error on operation: ${operation ? operation.gufi : "Operation sin GUFI"}`)
  logError(
    `Error on operation: ${
      operation ? operation.gufi : "Operation sin GUFI"
    }\n${error}`,
    new Error()
  );
  try {
    operation.state = OperationState.CLOSED;
    operation.flight_comments = `${error}\n\n\n${operation.flight_comments}`;
    await operationDao.save(operation);
  } catch (error) {
    console.error("Error when save on update operation state");
  }

  try {
    const bodyMail = `<p>${error}</p>${operationMailHtml(operation)}`;

    mailAPI
      .sendMail(
        COMPANY_NAME!,
        adminEmail,
        "Debido a un error se pasó a CLOSE la operación : " + operation.gufi,
        bodyMail,
        bodyMail
      )
      .catch(() => {
        console.error("Email was not send");
      });
  } catch (error) {
    console.error("Error when send mail");
  }
}

async function changeState(
  operation: Operation,
  newState: OperationState,
  message = ""
) {
  // console.log(`Change the state of ${operation.gufi} from ${operation.state} to ${newState}`)
  const oldState = operation.state;
  operation.state = newState;

  const result = await operationDao.save(operation);

  logStateChange(operation.gufi, newState, oldState, message);
  sendOperationStateChange(
    operation.gufi,
    newState,
    "State changed automatically by the UTM"
  );

  // console.log(`Send mail ${JSON.stringify(operation, null, 2)}`)
  // const operationInfo = {
  // 	gufi: operation.gufi,
  // 	state: newState
  // };
  mailAPI
    .sendMail(
      COMPANY_NAME!,
      adminEmail,
      "Cambio de estado de operacion " + operation.name,
      operationMailHtml(operation),
      operationMailHtml(operation)
    )
    .catch(() => {
      console.error("Email was not send");
    });
  if (operation.owner && operation.owner.email) {
    mailAPI
      .sendMail(
        COMPANY_NAME!,
        [operation.owner.email],
        "Cambio de estado de operacion " + operation.name,
        operationMailHtml(operation),
        operationMailHtml(operation)
      )
      .catch(() => {
        console.error("Email was not send");
      });
  }
  sendUpdateOperation({
    gufi: operation.gufi,
    name: operation.name,
    state: operation.state,
    previousState: oldState,
    owner: operation.owner,
  });
  return result;
}
