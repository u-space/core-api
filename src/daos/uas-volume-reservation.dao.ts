/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository, QueryFailedError } from "typeorm";
import { UASVolumeReservation } from "../entities/uas-volume-reservation";
import { OperationVolume } from "../entities/operation-volume";
import {
  createFilter,
  errorMeansThatTheFilterPropColumnIsNotText,
  validatePaginationParams,
} from "./utils";
import { DataBaseError, InvalidDataError, NotFoundError } from "./db-errors";
import { TypeOrmErrorType } from "./type-orm-error-type";

export class UASVolumeReservationDao {
  private repository = getRepository(UASVolumeReservation);

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

    try {
      const filter: any = createFilter(
        "message_id",
        orderProp,
        orderValue,
        take,
        skip,
        filterProp,
        filterValue
      );

      const [uvrs, count] = await this.repository.findAndCount(filter);

      return { uvrs, count };
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
          `You can not filter by "${filterProp}" because it is not an uvr property`,
          error
        );
      } else if (
        error.message.startsWith(
          `${orderProp} column was not found in the RestrictedFlightVolume entity`
        )
      ) {
        throw new InvalidDataError(
          `You can not order by "${orderProp}" because it is not an uvr property`,
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

  async one(message_id: string) {
    try {
      return await this.repository.findOneOrFail(message_id);
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no uvr with the "message_id" received (message_id=${message_id})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute UASVolumeReservationDao.one(${message_id})`,
          error
        );
      }
    }
  }

  getFromEnaireLayerId(enaire_layer_id: string) {
    return this.repository.find({ where: { enaire_layer_id } });
  }

  async save(entity: UASVolumeReservation) {
    try {
      return await this.repository.save(entity);
    } catch (error: any) {
      console.log(error);
      throw new DataBaseError(
        "There was an error trying to execute UASVolumeReservationDao.save(entity)",
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
          // it means the id received is not an uuid, so we throw NotFoundError
          throw new NotFoundError(
            `There is no uvr with the received id (id=${id})`,
            error
          );
        }
      }
      throw new DataBaseError(
        `Error trying to remove an uvr (id=${id})`,
        error
      );
    }
  }

  async countUvrIntersections(volume: OperationVolume) {
    return this.repository
      .createQueryBuilder("uas_volume_reservation")
      .where(
        '(tsrange(effective_time_begin, "effective_time_end") && tsrange(:date_begin, :date_end) ) ' +
          ' AND (numrange("min_altitude", "max_altitude") && numrange(:min_altitude, :max_altitude)) ' +
          ' AND (ST_Intersects("geography" ,ST_GeomFromGeoJSON(:geom)))'
      )
      .setParameters({
        date_begin: volume.effective_time_begin,
        date_end: volume.effective_time_end,
        min_altitude: volume.min_altitude,
        max_altitude: volume.max_altitude,
        geom: JSON.stringify(volume.operation_geography),
      })
      .getCount();
  }

  async getUvrIntersections(volume: OperationVolume) {
    return this.repository
      .createQueryBuilder("uas_volume_reservation")
      .where(
        '(tsrange(effective_time_begin, "effective_time_end") && tsrange(:date_begin, :date_end) ) ' +
          ' AND (numrange("min_altitude", "max_altitude") && numrange(:min_altitude, :max_altitude)) ' +
          ' AND (ST_Intersects("geography" ,ST_GeomFromGeoJSON(:geom)))'
      )
      .setParameters({
        date_begin: volume.effective_time_begin,
        date_end: volume.effective_time_end,
        min_altitude: volume.min_altitude,
        max_altitude: volume.max_altitude,
        geom: JSON.stringify(volume.operation_geography),
      })
      .getMany();
  }
}
