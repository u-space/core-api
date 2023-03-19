/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository, InsertResult } from "typeorm";
import { Document } from "../entities/document";
import { DataBaseError, NotFoundError } from "./db-errors";
import { TypeOrmErrorType } from "./type-orm-error-type";

export class DocumentDao {
  private repository = getRepository(Document);

  async all() {
    try {
      return this.repository.find({});
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute Document.all()",
        error
      );
    }
  }

  async one(id: string) {
    try {
      return await this.repository.findOneOrFail({ where: { id } });
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no document with the "id" received (id=${id})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute DocumentDao.one(${id})`,
          error
        );
      }
    }
  }

  async save(document: Document): Promise<void> {
    try {
      const dbResult: InsertResult = await this.repository.insert(document);
      document.id = dbResult.raw[0]["id"];
      document.upload_time = `${dbResult.raw[0]["upload_time"]}`;
      document.valid = dbResult.raw[0]["valid"];
      document.extra_fields = JSON.parse(dbResult.raw[0]["extra_fields"]);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute DocumentDao.save(entity)",
        error
      );
    }
  }

  async update(entity: Document) {
    try {
      return this.repository.save(entity);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute Document.update(entity)",
        error
      );
    }
  }

  async remove(id: string) {
    const userToRemove: any = await this.repository.findOne({ where: { id } });
    await this.repository.remove(userToRemove);
  }
}
