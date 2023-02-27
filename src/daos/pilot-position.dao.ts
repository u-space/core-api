/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository } from "typeorm";
import { PilotPosition } from "../entities/pilot-position";
import { DataBaseError } from "./db-errors";

export class PilotPositionDao {
  private repository = getRepository(PilotPosition);

  async save(entity: any) {
    try {
      return await this.repository.save(entity);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute PilotPositionDao.save(entity)",
        error
      );
    }
  }

  async findLastPosition(gufi: string) {
    return await this.repository.findOne({
      where: {
        gufi: gufi,
      },
      order: {
        time_sent: "DESC",
      },
    });
  }
}
