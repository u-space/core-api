/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Between,
  EntityColumnNotFound,
  getRepository,
  ILike,
  InsertResult,
  LessThan,
  MoreThan,
  QueryFailedError,
} from "typeorm";
import { Document } from "../entities/document";
import { DataBaseError, InvalidDataError, NotFoundError } from "./db-errors";
import { TypeOrmErrorType } from "./type-orm-error-type";

export class DocumentDao {
  private repository = getRepository(Document);

  async all(status?: string,
    orderProp?: string,
    orderValue?: string,
    take?: number,
    skip?: number,
    filterProp?: string,
    filterValue?: string,
    deleted?: boolean
  ): Promise<{ documents: Document[]; count: number }> {
    try {

      const filter: any = {};
      filter.where = [];
      if (filterProp && filterValue) {
        const multiFilter = filterProp.split(",");
        if (multiFilter.length > 0) {
          filter.where = [];
          for (const prop of multiFilter) {
            if (prop === 'id') {
              filter.where.push({ [prop]: filterValue });
            } else {
              filter.where.push({ [prop]: ILike("%" + filterValue + "%") });
            }
          }
        } else {
          if (filterProp === 'id') {
            filter.where[filterProp] = filterValue;
          } else {
            filter.where[filterProp] = ILike("%" + filterValue + "%");
          }
        }

      }
      if (orderProp && orderValue) {
        filter.order = {};
        filter.order[orderProp] = orderValue;
      }
      if (deleted) {
        filter.withDeleted = true;
      }
      filter.take = status ? 10000 : take || 10; // Do not paginate if we want to filter by status, otherwise the count is going to be reaaally off
      filter.skip = status ? 0 : skip || 0;
      let dbResult: [Document[], number];
      // const documents = await this.repository.find({});
      try {
        console.log("DocumentDao::all filter", JSON.stringify(filter, null, 2));
        dbResult = await this.repository.findAndCount(filter);
      } catch (error: any) {
        if (error instanceof EntityColumnNotFound) {
          throw new InvalidDataError(
            `filterProp is not valid (filterProp=${filterProp})`,
            error
          );
        } else if (error instanceof QueryFailedError) {
          if (
            (error as QueryFailedError).message.startsWith(
              "operator does not exist"
            )
          ) {
            throw new InvalidDataError(
              `filterProp is not valid (filterProp=${filterProp})`,
              error
            );
          }
        }
        throw new DataBaseError(
          "Error trying to get the users from the db",
          error
        );
      }

      const [documents, count] = dbResult;

      documents.forEach((doc) => {
        doc.extra_fields = doc.extra_fields_json;
        delete doc.extra_fields_json;
      });
      return { documents: documents, count };
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute Document.all()",
        error
      );
    }
  }

  async getExpiredDocuments(): Promise<Document[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const documents = await this.repository.find({
      where: {
        valid_until: LessThan(today),
        valid: true,
      },
    });
    return documents;
  }

  async getNextoToExpireDocuments(nextDate: Date): Promise<Document[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const documents = await this.getExpireDocumentsBetween(today, nextDate);
    return documents;
  }

  async getExpireDocumentsBetween(
    firstDate: Date,
    secondDate: Date
  ): Promise<Document[]> {
    const documents = await this.repository.find({
      where: {
        valid_until: Between(firstDate, secondDate),
        valid: true,
      },
    });
    return documents;
  }

  async one(id: string): Promise<Document> {
    try {
      const document = await this.repository.findOneOrFail(id);
      document.extra_fields = document.extra_fields_json;
      delete document.extra_fields_json;
      return document;
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

  async save(document: Document): Promise<Document> {
    try {
      document.extra_fields_json = document.extra_fields;
      const dbResult: InsertResult = await this.repository.insert(document);
      document.id = dbResult.raw[0]["id"];
      document.upload_time = `${dbResult.raw[0]["upload_time"]}`;
      document.valid = dbResult.raw[0]["valid"];
      document.extra_fields = dbResult.raw[0]["extra_fields_json"];
      delete document.extra_fields_json;
      return document;
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute DocumentDao.save(entity)",
        error
      );
    }
  }

  async update(entity: Document) {
    try {
      entity.extra_fields_json = entity.extra_fields;
      const docUpdated = await this.repository.save(entity);
      docUpdated.extra_fields = docUpdated.extra_fields_json;
      delete docUpdated.extra_fields_json;
      return docUpdated;
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute Document.update(entity)",
        error
      );
    }
  }

  async remove(id: string) {
    const userToRemove: any = await this.repository.findOne(id);
    await this.repository.remove(userToRemove);
  }

  async softDelete(id: string) {
    const documentToRemove: any = await this.repository.findOne(id);
    console.log("softDelete: " + id);

    await this.repository.softDelete(id);
  }
}
