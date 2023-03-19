/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository, QueryFailedError } from "typeorm";
import { isString } from "util";
import { OperationVolume } from "../entities/operation-volume";
import { RestrictedFlightVolume } from "../entities/restricted-flight-volume";
import { DataBaseError, InvalidDataError, NotFoundError } from "./db-errors";
import { TypeOrmErrorType } from "./type-orm-error-type";
import {
  validatePaginationParams,
  createFilter,
  errorMeansThatTheFilterPropColumnIsNotText,
} from "./utils";

export class RestrictedFlightVolumeDao {
  private repository = getRepository(RestrictedFlightVolume);

  async all(
    take?: number,
    skip?: number,
    filterProp?: string,
    filterValue?: string,
    orderProp?: string,
    orderValue?: string
  ) {
    validatePaginationParams(
      take,
      skip,
      filterProp,
      filterValue,
      orderProp,
      orderValue
    );
    if (isString(filterProp) && !["id", "comments"].includes(filterProp)) {
      throw new InvalidDataError("Invalid filter", null);
    }
    try {
      const filter: any = createFilter(
        "id",
        orderProp,
        orderValue,
        take,
        skip,
        filterProp,
        filterValue
      );

      const [rfvs, count] = await this.repository.findAndCount(filter);

      return { rfvs, count };
    } catch (error: any) {
      if (errorMeansThatTheFilterPropColumnIsNotText(error)) {
        throw new InvalidDataError(
          `You only can filter by columns of type text (filterProp=${filterProp})`,
          error
        );
      }
      if (
        error.name === TypeOrmErrorType.EntityColumnNotFound &&
        error.message.startsWith(`No entity column "${filterProp}" was found`)
      ) {
        throw new InvalidDataError(
          `You can not filter by "${filterProp}" because it is not an rfv property`,
          error
        );
      } else if (
        error.message.startsWith(
          `${orderProp} column was not found in the RestrictedFlightVolume entity`
        )
      ) {
        throw new InvalidDataError(
          `You can not order by "${orderProp}" because it is not an rfv property`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute RestrictedFlightVolumeDao.all(${orderProp}, ${orderValue}, ${take}, ${skip}, ${filterProp}, ${filterValue})`,
          error
        );
      }
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
          `There is no rfv with the "id" received (id=${id})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute RestrictedFlightVolumeDao.one(${id})`,
          error
        );
      }
    }
  }

  async save(entity: RestrictedFlightVolume) {
    try {
      return this.repository.save(entity);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute RestrictedFlightVolumeDao.save(entity)",
        error
      );
    }
  }

  async remove(id: string) {
    try {
      await this.repository.softDelete(id);
    } catch (error: any) {
      if (error instanceof QueryFailedError) {
        if (
          (error as QueryFailedError).message.startsWith(
            "invalid input syntax for type uuid"
          )
        ) {
          throw new NotFoundError(
            `There is no rfv with the received id (id=${id})`,
            error
          );
        }
      }
      throw new DataBaseError(
        `Error trying to delete an rfv (id=${id})`,
        error
      );
    }
  }

  async countRfvIntersections(volume: OperationVolume) {
    const count = await this.repository
      .createQueryBuilder("restricted_flight_volume")
      .where(
        '(numrange("min_altitude", "max_altitude") && numrange(:min_altitude, :max_altitude)) ' +
          ' AND (ST_Intersects("geography" ,ST_GeomFromGeoJSON(:geom)))'
      )
      .setParameters({
        min_altitude: volume.min_altitude,
        max_altitude: volume.max_altitude,
        geom: JSON.stringify(volume.operation_geography),
      })
      .getCount();
    return count;
  }

  async getRfvIntersections(volume: OperationVolume) {
    const count = await this.repository
      .createQueryBuilder("restricted_flight_volume")
      .where(
        '(numrange("min_altitude", "max_altitude") && numrange(:min_altitude, :max_altitude)) ' +
          ' AND (ST_Intersects("geography" ,ST_GeomFromGeoJSON(:geom)))'
      )
      .setParameters({
        min_altitude: volume.min_altitude,
        max_altitude: volume.max_altitude,
        geom: JSON.stringify(volume.operation_geography),
      })
      .getMany();
    return count;
  }
}
