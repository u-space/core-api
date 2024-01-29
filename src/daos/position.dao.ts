/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository } from "typeorm";
import { Operation } from "../entities/operation";
import { Position } from "../entities/position";
import { DataBaseError, NotFoundError } from "./db-errors";
import { TypeOrmErrorType } from "./type-orm-error-type";

export class PositionDao {
  private repository = getRepository(Position);

  async all() {
    try {
      return this.repository.find();
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute PositionDao.all()",
        error
      );
    }
  }

  async one(id: string) {
    try {
      return this.repository.findOneOrFail(id);
    } catch (error: any) {
      if (error.name === TypeOrmErrorType.EntityNotFound) {
        throw new NotFoundError(
          `There is no position with the "id" received (id=${id})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute PositionDao.one(${id})`,
          error
        );
      }
    }
  }

  async oneByGufiWithDates(gufi: string, startDate: Date, endDate: Date) {
    return await this.repository
      .createQueryBuilder("position")
      .select("position")
      .where("position.gufi = :gufi", { gufi })
      .andWhere("position.time_sent >= :startDate", { startDate })
      .andWhere("position.time_sent <= :endDate", { endDate })
      // Include position gufi in the result, load eager relation
      .leftJoinAndSelect("position.gufi", "operation")
      // Include position uvin in the result, load eager relation
      .leftJoinAndSelect("position.uvin", "uvin")
      .getMany();
  }

  async save(entity: any) {
    try {
      return this.repository.save(entity);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute PositionDao.save(entity)",
        error
      );
    }
  }

  async savePositionsArray(entities: any) {
    return this.repository.save(entities);
  }

  async checkPositionWithOperation(position: Position) {
    const result = await getRepository(Operation)
      .createQueryBuilder("operation")
      .select(
        'st_contains(operation_volume."operation_geography" ,ST_GeomFromGeoJSON(:origin)) AND ( CAST(:altitude as numeric) <@ numrange(operation_volume."min_altitude", operation_volume."max_altitude")) AND ( CAST(:time as timestamptz) <@ tstzrange(operation_volume."effective_time_begin", operation_volume."effective_time_end")) AND state = \'ACTIVATED\'',
        "inOperation"
      )
      .innerJoin("operation.operation_volumes", "operation_volume")
      .where('operation."gufi" = :gufi')
      .setParameters({
        gufi: position.gufi,
        altitude: position.altitude_gps,
        origin: JSON.stringify(position.location),
        time: position.time_sent,
      })

      .getRawMany();
    // Returns true if its has any result.inOperation in true else false
    return result.some((result) => result.inOperation);
  }

  async existsPositionForOperation(operationGufi: string) {
    const dbResult = await getRepository(Position)
      .createQueryBuilder("position")
      .where("position.gufiGufi = :gufi", { gufi: operationGufi })
      .getOne();
    return typeof dbResult !== "undefined";
  }

  // async remove(id : string) {
  //     let userToRemove = await this.repository.findOne(id);
  //     await this.repository.remove(userToRemove);
  // }
}
