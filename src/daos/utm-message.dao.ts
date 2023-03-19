/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository } from "typeorm";
import { UTMMessage } from "../entities/utm-message";
import { DataBaseError, NotFoundError } from "./db-errors";
import { TypeOrmErrorType } from "./type-orm-error-type";

export class UTMMessageDao {
  private repository = getRepository(UTMMessage);

  async all() {
    try {
      return this.repository.find();
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute UTMMessageDao.all()",
        error
      );
    }
  }

  async one(message_id: string) {
    try {
      return await this.repository.findOneOrFail({ where: { message_id } });
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no utm message with the "message_id" received (message_id=${message_id})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute UtmMessageDao.one(${message_id})`,
          error
        );
      }
    }
  }

  async save(msg: UTMMessage) {
    try {
      return this.repository.save(msg);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute UtmMessageDao.save(entity)",
        error
      );
    }
  }

  async remove(id: string) {
    const userToRemove: any = await this.repository.findOne({
      where: { message_id: id },
    });
    await this.repository.remove(userToRemove);
  }
}
