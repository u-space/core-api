/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { PositionDao } from "../../../daos/position.dao";
import { PilotPositionDao } from "../../../daos/pilot-position.dao";
import { OperationDao } from "../../../daos/operation.dao";
import {
  sendPositionToMonitor,
  sendOperationFlyStatus,
  sendUpdateOperation,
  sendOperationStateChange,
} from "../../socket-io/async-browser-comunication";
import { Operation, OperationState } from "../../../entities/operation";

export class MQTTPositionController {
  private dao = new PositionDao();
  private operationDao: OperationDao;
  private pilotPositionDao: PilotPositionDao;

  constructor() {
    this.operationDao = new OperationDao();
    this.pilotPositionDao = new PilotPositionDao();
  }

  async save(position: unknown, _username: string) {
    try {
      const gufi = (position as { gufi: string }).gufi;
      let errors = [];
      errors = validatePosition(position);
      if (typeof gufi === "undefined") {
        errors.push("gufi was not received");
      }
      if (errors.length == 0) {
        //save position
        const positionSaved = await this.dao.save(position);

        //check if position is inside de operation volume of associated operation
        const inOperation = await this.dao.checkPositionWithOperation(
          positionSaved
        );

        if (this.operationDao == undefined) {
          this.operationDao = new OperationDao();
        }
        const operation: Operation = await this.operationDao.one(gufi);
        if (!inOperation) {
          const lastState = operation.state;

          if (lastState !== OperationState.ROGUE) {
            //if position is not inside the associated operation then change operation status as ROUGE
            await this.operationDao.updateState(
              gufi,
              OperationState.ROGUE,
              lastState,
              "position outside operation volume"
            );
            sendOperationStateChange(
              operation.gufi,
              OperationState.ROGUE,
              "Vehicle left operation volume"
            );
            sendUpdateOperation({
              gufi: operation.gufi,
              name: operation.name,
              state: OperationState.ROGUE,
              previousState: lastState,
              owner: operation.owner,
            });
          }
        }

        //send information to web browser
        sendOperationFlyStatus(inOperation);

        const pilotPosition = await this.pilotPositionDao.findLastPosition(
          gufi
        );

        if (pilotPosition === undefined) {
          sendPositionToMonitor(positionSaved, operation.controller_location);
        } else {
          sendPositionToMonitor(positionSaved, pilotPosition.location);
        }

        return;
      } else {
        return;
      }
    } catch (error) {
      console.error(error);
      return;
    }
  }
}

function validatePosition(position: any) {
  const errors = [];
  if (position["heading"] !== undefined) {
    if (
      !(
        typeof (position as { heading: unknown }).heading === "number" &&
        (position as { heading: number }).heading >= -180 &&
        (position as { heading: number }).heading <= 180
      )
    ) {
      errors.push("Invalid heading");
    }
  }
  return errors;
}
