/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository } from "typeorm";
// import { Position } from "../entities/Position";
import { Approval } from "../entities/approval";
import { DataBaseError, NotFoundError } from "./db-errors";
import { TypeOrmErrorType } from "./type-orm-error-type";

export class ApprovalDao {
  private repository = getRepository(Approval);

  async all() {
    try {
      return this.repository.find();
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute ApprovalDao.all()",
        error
      );
    }
  }

  async one(id: string) {
    try {
      return this.repository.findOneOrFail(id);
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no approval with the "id" received (id=${id})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute ApprovalDao.one(${id})`,
          error
        );
      }
    }
  }

  async save(entity: any) {
    try {
      return this.repository.insert(entity);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute ApprovalDao.save(entity)",
        error
      );
    }
  }
}
