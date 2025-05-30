/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { EntityManager, getManager, getRepository, ILike, In } from "typeorm";

import { Point, Polygon } from "geojson";
import { Operation, OperationState } from "../entities/operation";
import { OperationVolume } from "../entities/operation-volume";
import { DataBaseError, InvalidDataError, NotFoundError } from "./db-errors";
import { TypeOrmErrorType } from "./type-orm-error-type";

import {
  PriorityElements,
  PriorityStatus,
} from "../entities/priority-elements";
import { VehicleReg } from "../entities/vehicle-reg";
import { validatePaginationParams } from "./utils";

import { buffer, circle, distance, lineString } from "@turf/turf";
import { isNullOrUndefined } from "util";
import { logStateChange } from "../controllers/utils";
import { RegularFlight } from "../entities/regular-flight";
import { Tracker } from "../entities/trackers/tracker";
import { User } from "../entities/user";
import { STRATEGIC_DECONFLICT_MODE_DISABLED } from "../utils/config.utils";
import { validateNumber } from "../utils/validation.utils";
import { RestrictedFlightVolumeDao } from "./restricted-flight-volume.dao";
import { UASVolumeReservationDao } from "./uas-volume-reservation.dao";
// import { polygon, union } from 'turf';

export class OperationDao {
  private repository = getRepository(Operation);
  private repositoryOperationVolume = getRepository(OperationVolume);

  async getOperationByPoint(point: Point) {
    this.validatePoint(point);
    try {
      return this.repository
        .createQueryBuilder("operation")
        .leftJoinAndSelect("operation.creator", "creator")
        .leftJoinAndSelect("operation.owner", "owner")
        .innerJoinAndSelect("operation.operation_volumes", "operation_volume")

        .where(
          'st_contains(operation_volume."operation_geography" ,ST_GeomFromGeoJSON(:origin))'
        )
        .setParameters({
          origin: JSON.stringify(point),
        })
        .getMany();
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute OperationDaos.getOperationByPoint(point)",
        error
      );
    }
  }

  async getOperationByVolume(
    dateBegin: Date,
    dateEnd: Date,
    minAltitude: number,
    maxAltitude: number,
    operationGeography: Polygon
  ) {
    if (!dateBegin || !dateEnd || !operationGeography) {
      throw new InvalidDataError(
        `dateBegin, dateEnd and operationGeography can not be undefined or null (dateBegin=${dateBegin} dateEnd=${dateEnd} operationGeography=${operationGeography})`,
        undefined
      );
    }
    if (dateEnd <= dateBegin) {
      throw new InvalidDataError(
        `dateEnd must be after dateBegin (dateBegin=${dateBegin}, dateEnd=${dateEnd})`,
        undefined
      );
    }
    if (maxAltitude <= minAltitude) {
      throw new InvalidDataError(
        `maxAltitude must be greater than minAltitude (minAltitude=${minAltitude}, maxAltitude=${maxAltitude})`,
        undefined
      );
    }
    try {
      return this.repository
        .createQueryBuilder("operation")
        .leftJoinAndSelect("operation.creator", "creator")
        .leftJoinAndSelect("operation.owner", "owner")
        .innerJoinAndSelect("operation.operation_volumes", "operation_volume")
        .where(
          'tstzrange(operation_volume."effective_time_begin", operation_volume."effective_time_end") && tstzrange(:date_begin, :date_end) '
        )
        .andWhere(
          '(numrange(operation_volume."min_altitude", operation_volume."max_altitude") && numrange(:min_altitude, :max_altitude)) '
        )
        .andWhere(
          '(ST_Intersects(operation_volume."operation_geography" ,ST_GeomFromGeoJSON(:geom)))'
        )
        .setParameters({
          date_begin: dateBegin,
          date_end: dateEnd,
          min_altitude: minAltitude,
          max_altitude: maxAltitude,
          geom: JSON.stringify(operationGeography),
        })
        .getMany();
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute OperationDaos.getOperationByVolume(volume)",
        error
      );
    }
  }

  async getOperationByPolygonAndAltitude(
    minAltitude: number,
    maxAltitude: number,
    operationGeography: Polygon
  ) {
    if (!operationGeography) {
      throw new InvalidDataError(
        `operationGeography can not be undefined or null (operationGeography=${operationGeography})`,
        undefined
      );
    }
    if (maxAltitude <= minAltitude) {
      throw new InvalidDataError(
        `maxAltitude must be greater than minAltitude (minAltitude=${minAltitude}, maxAltitude=${maxAltitude})`,
        undefined
      );
    }
    try {
      return this.repository
        .createQueryBuilder("operation")
        .leftJoinAndSelect("operation.creator", "creator")
        .leftJoinAndSelect("operation.owner", "owner")
        .innerJoinAndSelect("operation.operation_volumes", "operation_volume")

        .where(
          '(numrange(operation_volume."min_altitude", operation_volume."max_altitude") && numrange(:min_altitude, :max_altitude)) ' +
          ' AND (ST_Intersects(operation_volume."operation_geography" ,ST_GeomFromGeoJSON(:geom)))'
        )
        .setParameters({
          min_altitude: minAltitude,
          max_altitude: maxAltitude,
          geom: JSON.stringify(operationGeography),
        })
        .getMany();
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute getOperationByPolygonAndAltitude(volume)",
        error
      );
    }
  }

  async intersectingVolumesCount(
    volume: OperationVolume,
    entManager?: EntityManager,
    gufi?: string
  ) {
    let qBuilder = this.repository.createQueryBuilder("operation");
    if (entManager !== undefined) {
      qBuilder = entManager.createQueryBuilder(Operation, "operation");
    }
    qBuilder = qBuilder
      .leftJoinAndSelect("operation.creator", "creator")
      .leftJoinAndSelect("operation.owner", "owner")
      .innerJoinAndSelect("operation.operation_volumes", "operation_volume")
      .where(
        "\"state\" in ('ACCEPTED', 'ACTIVATED', 'ROGUE', 'PENDING')"
      )
      .andWhere(
        '(tstzrange(operation_volume."effective_time_begin", operation_volume."effective_time_end") && tstzrange(:date_begin, :date_end))'
      )
      .andWhere(
        '(numrange(operation_volume."min_altitude", operation_volume."max_altitude") && numrange(:min_altitude, :max_altitude))'
      )
      .andWhere(
        '(ST_Intersects(operation_volume."operation_geography" ,ST_GeomFromGeoJSON(:geom)))'
      );

    const params: any = {
      date_begin: volume.effective_time_begin,
      date_end: volume.effective_time_end,
      min_altitude: volume.min_altitude,
      max_altitude: volume.max_altitude,
      geom: JSON.stringify(volume.operation_geography),
    };

    if (gufi !== undefined) {
      params.gufi = gufi;
      qBuilder = qBuilder.andWhere('operation_volume."operationGufi" != :gufi');
    }

    qBuilder = qBuilder.setParameters(params);
    return await qBuilder.getCount();
  }

  async intersectingOperations(
    volume: OperationVolume,
    entManager?: EntityManager,
    gufi?: string
  ) {
    let qBuilder = this.repository.createQueryBuilder("operation");
    if (entManager !== undefined) {
      qBuilder = entManager.createQueryBuilder(Operation, "operation");
    }
    qBuilder = qBuilder
      .leftJoinAndSelect("operation.creator", "creator")
      .leftJoinAndSelect("operation.owner", "owner")
      .innerJoinAndSelect("operation.operation_volumes", "operation_volume")
      .where(
        "\"state\" in ('ACCEPTED', 'ACTIVATED', 'ROGUE', 'PENDING')"
      )
      .andWhere(
        '(tstzrange(operation_volume."effective_time_begin", operation_volume."effective_time_end") && tstzrange(:date_begin, :date_end))'
      )
      .andWhere(
        '(numrange(operation_volume."min_altitude", operation_volume."max_altitude") && numrange(:min_altitude, :max_altitude))'
      )
      .andWhere(
        '(ST_Intersects(operation_volume."operation_geography" ,ST_GeomFromGeoJSON(:geom)))'
      );

    const params: any = {
      date_begin: volume.effective_time_begin,
      date_end: volume.effective_time_end,
      min_altitude: volume.min_altitude,
      max_altitude: volume.max_altitude,
      geom: JSON.stringify(volume.operation_geography),
    };

    if (gufi !== undefined) {
      params.gufi = gufi;
      qBuilder = qBuilder.andWhere('operation_volume."operationGufi" != :gufi');
    }

    qBuilder = qBuilder.setParameters(params);
    return await qBuilder.getMany();
  }

  async getOperationVolumeByVolumeCountExcludingOneOperation(
    gufi: string,
    volume: OperationVolume
  ) {
    if (!gufi || !volume) {
      throw new InvalidDataError(
        '"gufi" and "volume" are mandatory fields',
        undefined
      );
    }
    try {
      return this.repository
        .createQueryBuilder("operation")
        .leftJoinAndSelect("operation.creator", "creator")
        .leftJoinAndSelect("operation.owner", "owner")
        .innerJoinAndSelect("operation.operation_volumes", "operation_volume")
        .where('operation_volume."operationGufi" != :gufi')
        .andWhere("\"state\" in ('ACCEPTED', 'ACTIVATED', 'ROGUE', 'PENDING')")
        .andWhere(
          '(tstzrange(operation_volume."effective_time_begin", operation_volume."effective_time_end") && tstzrange(:date_begin, :date_end))'
        )
        .andWhere(
          '(numrange(operation_volume."min_altitude", operation_volume."max_altitude") && numrange(:min_altitude, :max_altitude))'
        )
        .andWhere(
          '(ST_Intersects(operation_volume."operation_geography" ,ST_GeomFromGeoJSON(:geom)))'
        )
        .setParameters({
          gufi: gufi,
          date_begin: volume.effective_time_begin,
          date_end: volume.effective_time_end,
          min_altitude: volume.min_altitude,
          max_altitude: volume.max_altitude,
          geom: JSON.stringify(volume.operation_geography),
        })
        .getMany();
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.QueryFailedError &&
        error.message.startsWith("invalid input syntax for type uuid")
      ) {
        throw new InvalidDataError(
          `The gufi received is not a valid uuid (gufi=${gufi})`,
          error
        );
      } else {
        throw new DataBaseError(
          "There was an error trying to execute OperationDaos.getOperationVolumeByVolumeCountExcludingOneOperation(gufi, volume)",
          error
        );
      }
    }
  }

  async all(
    states?: string[],
    orderProp?: string,
    orderValue?: "ASC" | "DESC",
    take?: number,
    skip?: number,
    filterProp?: string,
    filterValue?: string,
    timeRange?: { start: string; end: string },
    owner?: string
  ): Promise<[Operation[], number]> {
    console.log("all(), states:", states, ", ownwer:", owner);
    validatePaginationParams(
      take,
      skip,
      filterProp,
      filterValue,
      orderProp,
      orderValue
    );
    try {
      take = take ? take : 10;
      skip = skip ? skip : 0;

      const findOptions: any = { where: {} };
      if (states) {
        findOptions.where = { state: In(states) };
      }


      // console.log(
      //   "states:",
      //   states,
      //   ", filter:",
      //   filter,
      //   ", orderProp:",
      //   orderProp,
      //   ", orderValue:",
      //   orderValue,
      //   ", take:",
      //   take,
      //   ", skip:",
      //   skip,
      //   ", filterProp:",
      //   filterProp,
      //   ", filterValue:",
      //   filterValue,
      //   ", timeRange:",
      //   timeRange
      // );

      if (timeRange) {
        if (!timeRange.start || !timeRange.end) {
          throw new InvalidDataError(
            '"start" and "end" are mandatory fields',
            undefined
          );
        }
        if (filterProp && filterValue) {
          if (!findOptions.where) findOptions.where = {};
          if (filterProp === "gufi") {
            findOptions.where = `gufi::text ilike '${filterValue}'`;
          } else {
            findOptions.where[filterProp] = ILike("%" + filterValue + "%");
          }
        }
        const qb = this.repository
          .createQueryBuilder("operation")
          .leftJoinAndSelect("operation.creator", "creator")
          .leftJoinAndSelect("operation.owner", "owner")
          .innerJoinAndSelect(
            "operation.operation_volumes",
            "operation_volumes"
          )
          .leftJoinAndSelect("operation.uas_registrations", "uas_registrations")
          .leftJoinAndSelect(
            "operation.negotiation_agreements",
            "negotiation_agreements"
          )
          .leftJoinAndSelect("operation.contingency_plans", "contingency_plans")
          .leftJoinAndSelect("uas_registrations.operators", "operators")
          .leftJoinAndSelect(
            "uas_registrations.owner",
            "uas_registrations_owner"
          )
          .skip(skip as number)
          .take(take as number);

        if (orderProp && orderValue) {
          qb.orderBy("operation." + orderProp, orderValue);
        }
        qb.where(findOptions.where);

        qb.andWhere(
          '(tstzrange(operation_volumes."effective_time_begin", operation_volumes."effective_time_end") && tstzrange(:date_begin, :date_end))'
        );
        if (owner) {
          qb.andWhere("operation.owner = :owner", { owner: owner });
        }
        qb.setParameters({
          date_begin: timeRange.start,
          date_end: timeRange.end,
        });
        return await qb.getManyAndCount();
      } else {
        if (filterProp && filterValue) {
          if (!findOptions.where) findOptions.where = {};
          if (filterProp === "gufi") {
            findOptions.where.gufi = filterValue;
          } else {
            findOptions.where[filterProp] = ILike("%" + filterValue + "%");
          }
        }
        if (orderProp && orderValue) {
          findOptions.order = {};
          findOptions.order[orderProp] = orderValue;
        }
        findOptions.take = take;
        findOptions.skip = skip;
        if (owner) {
          findOptions.where.owner = owner;
        }
        console.log('filter::', JSON.stringify(findOptions, null, 2))
        // return await this.repository.findAndCount(filter);
        return await this.repository.findAndCount(findOptions);
      }
    } catch (error: any) {
      console.log(error);
      throw new DataBaseError(
        "There was an error trying to execute OperationDaos.all()",
        error
      );
    }
  }

  async one(gufi: string) {
    try {
      return await this.repository.findOneOrFail(gufi);
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no operation with the "gufi" received (gufi=${gufi})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute OperationDaos.one(${gufi})`,
          error
        );
      }
    }
  }

  async oneByCreator(gufi: string, username: string) {
    try {
      return await this.repository.findOneOrFail(gufi, {
        where: {
          creator: username,
        },
      });
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no operation with the "gufi" and "creator" received (gufi=${gufi},username=${username})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute OperationDaos.oneByCreator(${gufi})`,
          error
        );
      }
    }
  }

  async oneByOwner(gufi: string, username: string) {
    try {
      return await this.repository.findOneOrFail(gufi, {
        where: {
          owner: username,
        },
      });
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no operation with the "gufi" and the "owner" received (gufi=${gufi},username=${username})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute OperationDaos.oneByOwner(${gufi})`,
          error
        );
      }
    }
  }

  async save(op: Operation) {
    // verify op has 1 volume at least
    if (op.operation_volumes.length === 0)
      throw new InvalidDataError(
        "operation.operation_volumes.length === 0",
        undefined
      );

    // set operation begin and end
    this.setOperationBeginAndEnd(op);

    // save operation
    try {
      this.normalizeOperationData(op);
      return await this.repository.save(op);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute OperationDaos.save(entity)",
        error
      );
    }
  }

  async saveOverridingState(op: Operation): Promise<Operation> {
    // check operation have exactly one volume
    if (op.operation_volumes.length !== 1) {
      throw new InvalidDataError(
        `This method only can be used to save operations with one volume (volumesCount=${op.operation_volumes.length})`,
        undefined
      );
    }
    const volume = op.operation_volumes[0];
    const begin = new Date(volume.effective_time_begin);
    const end = new Date(volume.effective_time_end);

    // normalize operation data
    this.normalizeOperationData(op);

    // set operation begin and end
    op.begin = begin.toISOString();
    op.end = end.toISOString();

    // we have to execute a db transaction
    let opSaved: Operation | undefined = undefined;
    await getManager().transaction(async (entManager) => {
      let pendingOperation = false;
      if (!STRATEGIC_DECONFLICT_MODE_DISABLED) {
        // check the operation intersects with rfvs, uvrs or with other operations
        const res = await this.intersectWithOperationUvrOrRfv(entManager, op);
        // define operation state depending on if it intersects or not with other entities
        if (res !== undefined) {
          // operation intersects with another entity, so we created in PENDING state
          op.state = OperationState.PENDING;
          op.flight_comments = `${res}\n\n${op.flight_comments}`;
          pendingOperation = true;
        }
      }

      if (!pendingOperation) {
        // operation was not set as PENDING, so we still have to define the status of the operation
        if (end <= new Date()) {
          // it means operation already finished
          op.state = OperationState.CLOSED;
        } else if (begin <= new Date()) {
          // it means operation should be ACTIVATED
          op.state = OperationState.ACTIVATED;
        } else {
          // operation begins in the future
          op.state = OperationState.ACCEPTED;
        }
      }

      // save the operation
      opSaved = await entManager.save(Operation, op);
    });

    // return result
    if (opSaved === undefined) {
      throw new DataBaseError(
        "There was an error trying to save the operation into the database"
      );
    }
    return opSaved;
  }

  async updateState(
    gufi: any,
    state: OperationState,
    oldState: OperationState,
    reason: string
  ) {
    const res = await this.repository.update(gufi, { state: state, aircraft_comments: reason });
    logStateChange(gufi, state, oldState, reason);
    return res;
  }

  async updateStateWhereState(
    gufi: any,
    oldState: OperationState,
    state: OperationState,
    reason: string
  ) {
    const res = await this.repository.update(
      { gufi: gufi, state: oldState },
      { state: state }
    );
    logStateChange(gufi, state, oldState, reason);
    return res;
  }

  async remove(id: number) {
    const userToRemove: any = await this.repository.findOne(id);
    await this.repository.remove(userToRemove);
  }
  async removeOperation(entity: Operation) {
    return await this.repository.remove(entity);
  }

  async operationsByCreator(username: string, limit?: number, offset?: number) {
    const query = this.repository
      .createQueryBuilder("operation")
      .leftJoinAndSelect("operation.creator", "creator")
      .leftJoinAndSelect("operation.owner", "owner")
      .innerJoinAndSelect("operation.operation_volumes", "operation_volume")
      .leftJoinAndSelect("operation.uas_registrations", "uas_registration")
      .leftJoinAndSelect("uas_registration.owner", "vehicleowner")
      .leftJoinAndSelect("uas_registration.operators", "vehicleoperators")
      .where(' creator."username" =  :username')
      .orderBy("operation.submit_time", "DESC")
      .setParameters({
        username: username,
      });
    if (limit) {
      query.take(limit);
    }
    if (offset) {
      query.skip(offset);
    }

    return query.getMany();
  }

  async operationsByOwner(username: string, limit?: number, offset?: number) {
    const query = this.repository
      .createQueryBuilder("operation")
      .leftJoinAndSelect("operation.creator", "creator")
      .leftJoinAndSelect("operation.owner", "owner")
      .innerJoinAndSelect("operation.operation_volumes", "operation_volume")
      .leftJoinAndSelect("operation.uas_registrations", "uas_registration")
      .leftJoinAndSelect("uas_registration.owner", "vehicleowner")
      .leftJoinAndSelect("uas_registration.operators", "vehicleoperators")

      .where(' owner."username" =  :username')
      .orderBy("operation.submit_time", "DESC")
      .setParameters({
        username: username,
      });
    if (limit) {
      query.take(limit);
    }
    if (offset) {
      query.skip(offset);
    }

    return query.getMany();
  }

  //     select * from operation
  // where state in ('ACCEPTED', 'PROPOSED')
  async getOperationsForCron() {
    return this.repository
      .createQueryBuilder("operation")
      .innerJoinAndSelect("operation.operation_volumes", "operation_volume")
      .leftJoinAndSelect("operation.owner", "owner")
      .leftJoinAndSelect("operation.uas_registrations", "uas_registration")
      .where(
        "\"state\" in ('ACCEPTED', 'PROPOSED', 'ACTIVATED', 'ROGUE', 'PENDING')"
      )
      .getMany();
  }

  /**
   * Return all operations that contain 'point', altitude, time and uvin
   * @param point
   * @param altitude
   * @param time
   * @param uvin
   */
  async getOperationByPositionAndDrone(
    point: any,
    altitude: any,
    time: any,
    uvin: any
  ) {
    return this.repository
      .createQueryBuilder("operation")
      .innerJoinAndSelect("operation.operation_volumes", "operation_volume")
      .innerJoinAndSelect("operation.uas_registrations", "vehicle_reg")

      .where(
        'st_contains(operation_volume."operation_geography" ,ST_GeomFromGeoJSON(:origin))'
      )
      .andWhere(
        ':altitude ::numeric <@ numrange(operation_volume."min_altitude", operation_volume."max_altitude")'
      )
      .andWhere(
        ':time ::timestamptz <@ tstzrange(operation_volume."effective_time_begin", operation_volume."effective_time_end")'
      )
      .andWhere("\"state\" = 'ACTIVATED'")
      .andWhere('vehicle_reg."uvin" = :uvin')
      .andWhere("vehicle_reg.\"authorized\" = 'AUTHORIZED'")
      .setParameters({
        origin: JSON.stringify(point),
        altitude: altitude,
        time: new Date(time),
        uvin: uvin,
      })
      .getMany();
  }

  async getActivatedOperationByPosition(
    point: any,
    altitude: any
  ): Promise<Operation> {
    try {
      if (!point || isNullOrUndefined(altitude)) {
        throw new InvalidDataError(
          `point and altitude can not be null or undefined (point=${point}, altitude=${altitude})`,
          undefined
        );
      }
      this.validate2DPoint(point);
      if (!validateNumber(altitude, -100000000, 100000000)) {
        throw new InvalidDataError(
          `Invalid altitude. Must be a number between -100.000.000 and 100.000.000 (altitude=${altitude})`,
          undefined
        );
      }
      const result = await this.repository
        .createQueryBuilder("operation")
        .innerJoinAndSelect("operation.operation_volumes", "operation_volume")
        .leftJoinAndSelect("operation.uas_registrations", "uas_registrations")
        .leftJoinAndSelect("uas_registrations.operators", "operators")
        .where(
          'st_contains(operation_volume."operation_geography" ,ST_GeomFromGeoJSON(:origin))'
        )
        .andWhere(
          ':altitude ::numeric <@ numrange(operation_volume."min_altitude", operation_volume."max_altitude")'
        )
        .andWhere("\"state\" = 'ACTIVATED'")
        .setParameters({
          origin: JSON.stringify(point),
          altitude,
        })
        .getMany();
      if (result.length === 0) {
        throw new NotFoundError(
          `There is no ACTIVATED operation in the point and altitude received (point=${point}, altitude=${altitude})`,
          undefined
        );
      } else if (result.length === 1) {
        return result[0];
      } else {
        throw new DataBaseError(
          `There are more than one operation ACTIVATED in the same location (operations=${result.length})`
        );
      }
    } catch (error: any) {
      if (
        error instanceof InvalidDataError ||
        error instanceof NotFoundError ||
        error instanceof DataBaseError
      ) {
        throw error;
      } else {
        throw new DataBaseError(
          `There was an error trying to execute OperationDaos.getActivatedOperationByPosition(${point}, ${altitude})`,
          error
        );
      }
    }
  }

  /**
   * Return all operations that contain 'point', altitude, time and uvin
   * @param point
   * @param altitude
   * @param time
   * @param uvin
   */
  async getOperationByPositionAndDroneTrackerId(
    point: any,
    altitude: any,
    time: any,
    trackerId: any
  ) {
    const query = this.repository
      .createQueryBuilder("operation")
      .innerJoinAndSelect("operation.operation_volumes", "operation_volume")
      .innerJoinAndSelect("operation.uas_registrations", "vehicle_reg")
      .leftJoinAndSelect(
        Tracker,
        "tracker",
        "tracker.vehicleUvin = vehicle_reg.uvin"
      )
      .where(
        'st_contains(operation_volume."operation_geography" ,ST_GeomFromGeoJSON(:point))'
      )
      .andWhere(
        ':altitude ::numeric <@ numrange(operation_volume."min_altitude", operation_volume."max_altitude")'
      )
      .andWhere(
        ':time ::timestamptz <@ tstzrange(operation_volume."effective_time_begin", operation_volume."effective_time_end")'
      )
      .andWhere("\"state\" = 'ACTIVATED'")
      .andWhere('tracker."hardware_id" = :trackerId')
      .andWhere("vehicle_reg.\"authorized\" = 'AUTHORIZED'")
      .setParameters({
        point: JSON.stringify(point),
        altitude: altitude,
        time: new Date(time),
        trackerId: trackerId,
      });

    try {
      const ops = await query.getMany();
      return ops;
    } catch (error: any) {
      console.error("Error en position dao", error);
    }
  }

  async createOperationFromRegularFlight(
    regularFlight: RegularFlight,
    effective_time_begin: string,
    owner: User,
    contact: string,
    contact_phone: string,
    uas_registration: VehicleReg[],
    creator: User,
    name: string
  ) {
    const operation = new Operation();
    operation.name = name;
    operation.state = OperationState.PROPOSED;
    operation.uas_registrations = uas_registration;
    operation.owner = owner;
    operation.creator = creator;
    operation.contact = contact;
    operation.contact_phone = contact_phone;
    //-----------------------------------------//

    //operation_volumes is the hard part
    const operation_volumes: OperationVolume[] = [];

    //---------------------------------------------//
    //First volume, from vertiport to firt point of regular flight
    const operation_volume_start = new OperationVolume();
    operation_volume_start.ordinal = 0;
    operation_volume_start.beyond_visual_line_of_sight = true;
    operation_volume_start.effective_time_begin = effective_time_begin;
    //sets the end time  to the beggining time plus a number of seconds
    operation_volume_start.effective_time_end = new Date(
      new Date(effective_time_begin).getTime() +
      (regularFlight.getPath()[0].getStart().getAltitude() /
        regularFlight.getVerticalSpeed()) *
      1000
    ).toISOString();
    operation_volume_start.min_altitude = 0;
    operation_volume_start.max_altitude =
      regularFlight.getPath()[0].getStart().getAltitude() +
      regularFlight.getPath()[0].getVerticalBuffer();
    //for the geography we will create a circle from the vertiport and radius of the vertiport buffer
    operation_volume_start.operation_geography = circle(
      regularFlight.getStartingPort().getPoint().toPoint(),
      this.fromMetersToKiloMeters(regularFlight.getStartingPort().getBuffer())
    ).geometry;
    operation_volumes.push(operation_volume_start);
    //---------------------------------------------//

    //for each segment we create a volume
    for (let i = 0; i < regularFlight.getPath().length; i++) {
      const path = regularFlight.getPath()[i];
      const segmentDistanceKilometers = distance(
        path.getStart().toPoint(),
        path.getEnd().toPoint()
      );
      const segmentDistance = this.fromKiloMetersToMeters(
        segmentDistanceKilometers
      );
      const operation_volume = new OperationVolume();
      operation_volume.ordinal = i + 1;
      operation_volume.beyond_visual_line_of_sight = true;
      //beggining time is the end time of the previous volume
      //less the buffer
      operation_volume.effective_time_begin = new Date(
        new Date(operation_volumes[i].effective_time_end).getTime() -
        path.getTimeBuffer() * 1000
      ).toISOString();
      //ending time is the beggining time plus the segment time plus the buffer
      operation_volume.effective_time_end = new Date(
        new Date(operation_volume.effective_time_begin).getTime() +
        (segmentDistance / path.getGroundSpeed()) * 1000 +
        path.getTimeBuffer() * 1000
      ).toISOString();
      operation_volume.min_altitude =
        (path.getStart().getAltitude() < path.getEnd().getAltitude()
          ? path.getStart().getAltitude()
          : path.getEnd().getAltitude()) - path.getVerticalBuffer();
      operation_volume.max_altitude =
        (path.getStart().getAltitude() > path.getEnd().getAltitude()
          ? path.getStart().getAltitude()
          : path.getEnd().getAltitude()) + path.getVerticalBuffer();
      //for the geography we will create a circle from the vertiport and radius of the vertiport buffer
      operation_volume.operation_geography = buffer(
        lineString([
          path.getStart().toPoint().geometry.coordinates,
          path.getEnd().toPoint().geometry.coordinates,
        ]),
        this.fromMetersToKiloMeters(path.getHorizontalBuffer())
      ).geometry;
      operation_volumes.push(operation_volume);
    }

    //---------------------------------------------//
    //last volume, from last point of regular flight to vertiport
    const operation_volume_end = new OperationVolume();
    operation_volume_end.ordinal = regularFlight.getPath().length + 1;
    operation_volume_end.beyond_visual_line_of_sight = true;
    operation_volume_end.effective_time_begin =
      operation_volumes[operation_volumes.length - 1].effective_time_end;
    //its the time between the last path point to 0
    const opVolumeEffTimeBegin = operation_volume_end.effective_time_begin;
    const timeBeginMillis = new Date(opVolumeEffTimeBegin).getTime();
    const regFlightPath = regularFlight.getPath();
    operation_volume_end.effective_time_end = new Date(
      timeBeginMillis +
      (regFlightPath[regFlightPath.length - 1].getEnd().getAltitude() /
        regularFlight.getVerticalSpeed()) *
      1000
    ).toISOString();
    operation_volume_end.min_altitude = 0;
    operation_volume_end.max_altitude =
      regFlightPath[regFlightPath.length - 1].getEnd().getAltitude() +
      regFlightPath[regFlightPath.length - 1].getVerticalBuffer();
    //for the geography we will create a circle from the vertiport and radius of the vertiport buffer
    operation_volume_end.operation_geography = circle(
      regularFlight.getEndingPort().getPoint().toPoint(),
      this.fromMetersToKiloMeters(regularFlight.getEndingPort().getBuffer())
    ).geometry;
    operation_volumes.push(operation_volume_end);
    //---------------------------------------------//

    operation.operation_volumes = operation_volumes;
    //TODO: LATER
    // let unionAux = polygon(
    // 	(operation.operation_volumes[0].operation_geography as Polygon).coordinates
    // );
    // for (let index = 0; index < operation.operation_volumes.length; index++) {
    // 	unionAux = union(
    // 		unionAux,
    // 		polygon(
    // 			(operation.operation_volumes[index].operation_geography as Polygon).coordinates
    // 		)
    // 	) as Feature<Polygon>;
    // }
    // const boundingVolume = new OperationVolume();
    // boundingVolume.beyond_visual_line_of_sight = true;

    // boundingVolume.effective_time_begin = operation.operation_volumes[0].effective_time_begin;
    // boundingVolume.effective_time_end =
    // 	operation.operation_volumes[operation.operation_volumes.length - 1].effective_time_end;
    // boundingVolume.max_altitude = operation.operation_volumes.reduce(function (prev, current) {
    // 	return prev.max_altitude > current.max_altitude ? prev : current;
    // }).max_altitude;
    // boundingVolume.min_altitude = operation.operation_volumes.reduce(function (prev, current) {
    // 	return prev.min_altitude < current.min_altitude ? prev : current;
    // }).min_altitude;

    // boundingVolume.operation_geography = unionAux.geometry;
    // operation.union_volume = boundingVolume;

    return await this.repository.save(operation);
  }
  private fromMetersToKiloMeters(meters: number): number {
    return meters / 1000;
  }

  private fromKiloMetersToMeters(kilometers: number): number {
    return kilometers * 1000;
  }

  private validate2DPoint(point: unknown) {
    if (
      !(point as { type: unknown }).type ||
      !(point as { coordinates: unknown }).coordinates
    )
      throw new InvalidDataError(
        "point must have a 'type' and a 'coordinates' property",
        undefined
      );
    if ((point as { type: unknown }).type !== "Point")
      throw new InvalidDataError(
        `Point type must be 'Point' (type=${(point as { type: unknown }).type
        })`,
        undefined
      );
    if (!Array.isArray((point as { coordinates: unknown }).coordinates))
      throw new InvalidDataError(
        "Point coordinates must be an array",
        undefined
      );
    if ((point as { coordinates: Array<unknown> }).coordinates.length !== 2)
      throw new InvalidDataError(
        `Point must have 2 coordinates (coordinates=${(point as { coordinates: Array<unknown> }).coordinates.length
        })`,
        undefined
      );
    const lng = (point as { coordinates: Array<unknown> }).coordinates[0];
    const lat = (point as { coordinates: Array<unknown> }).coordinates[1];
    if (!validateNumber(lng, -180, 180))
      throw new InvalidDataError(
        `Longitude must be a number between -180 and 180 (longitude=${lng})`,
        undefined
      );
    if (!validateNumber(lat, -90, 90))
      throw new InvalidDataError(
        `Latitude must be a number between -90 and 90 (latitude=${lat})`,
        undefined
      );
  }

  private validatePoint(point: Point) {
    if (point.coordinates.length !== 3) {
      throw new InvalidDataError(
        `The point must have 3 coordinates [lng, lat, alt] (coordinates=${point.coordinates.length})`,
        undefined
      );
    }
    if (point.coordinates[0] < -180 || point.coordinates[0] > 180) {
      throw new InvalidDataError(
        "The longitude must be a value between -180 and 180",
        undefined
      );
    }
    if (point.coordinates[1] < -90 || point.coordinates[1] > 90) {
      throw new InvalidDataError(
        "The latitude must be a value between -90 and 90",
        undefined
      );
    }
    if (point.coordinates[2] < -99999 || point.coordinates[2] > 99999) {
      throw new InvalidDataError(
        "The altitude must be a value between -99.999 and 99.999",
        undefined
      );
    }
  }

  private setOperationBeginAndEnd(operation: Operation) {
    let begin = Number.MAX_VALUE;
    let end = -Number.MAX_VALUE;
    for (const volume of operation.operation_volumes) {
      begin = Math.min(begin, new Date(volume.effective_time_begin).getTime());
      end = Math.max(end, new Date(volume.effective_time_end).getTime());
    }
    operation.begin = new Date(begin).toISOString();
    operation.end = new Date(end).toISOString();
  }

  private normalizeOperationData = (operation: Operation) => {
    if (operation.name) operation.name = operation.name.trim();
    if (operation.uss_name) operation.uss_name = operation.uss_name.trim();
    if (operation.discovery_reference)
      operation.discovery_reference = operation.discovery_reference.trim();
    if (operation.aircraft_comments)
      operation.aircraft_comments = operation.aircraft_comments.trim();
    if (operation.flight_comments)
      operation.flight_comments = operation.flight_comments.trim();
    if (operation.volumes_description)
      operation.volumes_description = operation.volumes_description.trim();
    if (operation.airspace_authorization)
      operation.airspace_authorization =
        operation.airspace_authorization.trim();
    if (operation.contact) operation.contact = operation.contact.trim();
    if (operation.contact_phone)
      operation.contact_phone = operation.contact_phone.trim();

    // we delete duplicate values from uas_registrations list
    if (!operation.uas_registrations) operation.uas_registrations = [];
    const vehicleUvins: string[] = [];
    const normalizedUASRegistrations: VehicleReg[] = [];
    for (let i = 0; i < operation.uas_registrations.length; i++) {
      const vehicle: VehicleReg = operation.uas_registrations[i];
      if (!vehicleUvins.includes(vehicle.uvin!)) {
        normalizedUASRegistrations.push(vehicle);
        vehicleUvins.push(vehicle.uvin!);
      }
    }
    operation.uas_registrations = normalizedUASRegistrations;

    // set default priority_elements
    if (!operation.priority_elements) {
      operation.priority_elements = new PriorityElements();
      operation.priority_elements.priority_level = undefined;
      operation.priority_elements.priority_status = PriorityStatus.NONE;
    }
  };

  async intersectWithOperationUvrOrRfv(
    entManager: EntityManager,
    operation: Operation
  ): Promise<string | undefined> {
    // We have to iterate each volume
    for (let i = 0; i < operation.operation_volumes.length; i++) {
      const volume = operation.operation_volumes[i];
      const gufi = operation.gufi;
      const res = await this.checkIntersections(volume, entManager, gufi);
      if (res.uvrsCount > 0) return "Intersect with UVR";
      if (res.operationsCount > 0) return "Intersect with operation";
      if (res.rfvsCount > 0) return "Intersect with RFV";
    }
    return undefined;
  }

  // ---------------------------------------------------------------
  // ---------------------- PRIVATE FUNCTIONS ----------------------
  // ---------------------------------------------------------------

  private async checkIntersections(
    volume: OperationVolume,
    entManager: EntityManager,
    gufi?: string
  ): Promise<CheckIntersectionsResult> {
    const operationsCount = await this.intersectingVolumesCount(
      volume,
      entManager,
      gufi
    );
    const uvrDao = new UASVolumeReservationDao();
    const uvrsCount = await uvrDao.intersectingUvrsCount(volume, entManager);
    const rfvDao = new RestrictedFlightVolumeDao();
    const rfvsCount = await (
      await rfvDao.getRfvIntersections(volume, entManager)
    ).length;
    return {
      operationsCount,
      uvrsCount,
      rfvsCount,
    };
  }
}

type CheckIntersectionsResult = {
  operationsCount: number;
  uvrsCount: number;
  rfvsCount: number;
};
