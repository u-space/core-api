/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AircraftType } from "../../entities/aircraft-type";
import { DataSource } from "typeorm";
import { DataBaseError, NotFoundError } from "../db-errors";
import { TypeOrmErrorType } from "../type-orm-error-type";
import IAircraftTypeDao from "../aircraft-type.dao";
import { convertAircraftTypeToAAAAircraftType } from "../utils/aircraft-type.utils";

export class AircraftTypeDaoTypeOrmImp implements IAircraftTypeDao {
  private dataSourceInitialized: DataSource;

  constructor(dataSourceInitialized: DataSource) {
    this.dataSourceInitialized = dataSourceInitialized;
  }

  async all() {
    try {
      const dbResult = await this.dataSourceInitialized.manager.find(
        AircraftType
      );
      return dbResult.map((aircraftType) =>
        convertAircraftTypeToAAAAircraftType(aircraftType)
      );
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute ApprovalDao.all()",
        error
      );
    }
  }

  async one(id: number) {
    try {
      const dbResult = await this.dataSourceInitialized.manager.findOneOrFail(
        AircraftType,
        { where: { id } }
      );
      return convertAircraftTypeToAAAAircraftType(dbResult);
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
      const dbResult = await this.dataSourceInitialized.manager.save(
        AircraftType,
        entity
      );
      return convertAircraftTypeToAAAAircraftType(dbResult);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute ApprovalDao.save(entity)",
        error
      );
    }
  }
}
