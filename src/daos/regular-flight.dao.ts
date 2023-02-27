/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { RegularFlight } from "../entities/regular-flight";
import { RegularFlightSegment } from "../entities/regular-flight-segment";
import { getRepository, SelectQueryBuilder } from "typeorm";
import { RegularFlightEntity } from "./entities/regular-flight.entity";
import { RegularFlightSegmentEntity } from "./entities/regular-flight-segment.entity";
import {
  addPaginationParamsToQuery,
  convertFromGeo3DPointToPoint,
  convertToGeo3DPoint,
  convertToVertiport,
  convertToVertiportEntity,
  handleTypeORMError,
  validatePaginationParams2,
} from "./utils";
import { DataBaseError, NotFoundError } from "./db-errors";
import { TypeOrmErrorType } from "./type-orm-error-type";

export class RegularFlightDao {
  private repository = getRepository(RegularFlightEntity);

  async one(id: string): Promise<RegularFlight> {
    try {
      const regularFlightEntity: RegularFlightEntity =
        await this.repository.findOneOrFail(id);
      return this.convertToRegularFlight(regularFlightEntity);
    } catch (error: any) {
      if (error.name === TypeOrmErrorType.EntityNotFound) {
        throw new NotFoundError(
          `There is no regular flight with the id received (id=${id})`,
          error
        );
      }
      throw new DataBaseError(
        `Error trying to get a regular flight (id=${id})`,
        error
      );
    }
  }

  async all(
    take = 10,
    skip = 0,
    filterBy?: string,
    filter?: string,
    orderBy = "created_at",
    order = "ASC"
  ): Promise<{ count: number; regularFlights: RegularFlight[] }> {
    validatePaginationParams2(
      take,
      skip,
      filterBy,
      filter,
      orderBy,
      order,
      ["id", "name"],
      ["created_at", "id", "name"]
    );

    try {
      const query: SelectQueryBuilder<RegularFlightEntity> = this.repository
        .createQueryBuilder("regularFlight")
        .leftJoinAndSelect("regularFlight.startingPort", "startingVertiport")
        .leftJoinAndSelect("regularFlight.endingPort", "endingVertiport")
        .leftJoinAndSelect("regularFlight.path", "path");

      const filterByNormalized = filterBy ? `regularFlight.${filterBy}` : null;
      addPaginationParamsToQuery(
        query,
        take,
        skip,
        filterByNormalized,
        filter,
        `regularFlight.${orderBy}`,
        order
      );
      query.addOrderBy("path.ordinal", "ASC");

      const [regularFlightEntities, count]: [RegularFlightEntity[], number] =
        await query.getManyAndCount();

      const result = {
        count,
        regularFlights: regularFlightEntities.map((entity) =>
          this.convertToRegularFlight(entity)
        ),
      };
      return result;
    } catch (error) {
      handleTypeORMError(error, "regularFlight", filterBy, orderBy);
      throw new Error("typeormerror was not handle");
    }
  }

  async save(regularFlight: RegularFlight): Promise<RegularFlight> {
    const regularFlightEntity: any =
      this.convertToRegularFlightEntity(regularFlight);
    delete regularFlightEntity.id;
    for (let i = 0; i < regularFlightEntity.path.length; i++) {
      delete regularFlightEntity.path[i].id;
      delete regularFlightEntity.path[i].regular_flight;
    }
    const regularFlightEntityAdded: RegularFlightEntity =
      await this.repository.save(regularFlightEntity);
    const result = this.one(regularFlightEntityAdded.id);
    return result;
  }

  // -------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------
  // ------------------------------ PRIVATE FUNCTIONS ------------------------------
  // -------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------

  private convertToRegularFlightEntity(
    regularFlight: RegularFlight
  ): RegularFlightEntity {
    return new RegularFlightEntity(
      regularFlight.getId(),
      convertToVertiportEntity(regularFlight.getStartingPort()),
      convertToVertiportEntity(regularFlight.getEndingPort()),
      regularFlight
        .getPath()
        .map((segment) => this.convertToRegularFlightSegmentEntity(segment)),
      regularFlight.getName(),
      regularFlight.getVerticalSpeed()
    );
  }

  private convertToRegularFlightSegmentEntity(
    regularFlightSegment: RegularFlightSegment
  ): RegularFlightSegmentEntity {
    return new RegularFlightSegmentEntity(
      regularFlightSegment.getId(),
      convertFromGeo3DPointToPoint(regularFlightSegment.getStart()),
      convertFromGeo3DPointToPoint(regularFlightSegment.getEnd()),
      regularFlightSegment.getHorizontalBuffer(),
      regularFlightSegment.getVerticalBuffer(),
      regularFlightSegment.getGroundSpeed(),
      regularFlightSegment.getTimeBuffer(),
      undefined,
      regularFlightSegment.getOrdinal()
    );
  }

  private convertToRegularFlight(
    regularFlightEntity: RegularFlightEntity
  ): RegularFlight {
    return new RegularFlight(
      regularFlightEntity.id,
      convertToVertiport(regularFlightEntity.startingPort),
      convertToVertiport(regularFlightEntity.endingPort),
      regularFlightEntity.path.map((segment) =>
        this.convertToRegularFlightSegment(segment)
      ),
      regularFlightEntity.name,
      regularFlightEntity.vertical_speed
    );
  }

  private convertToRegularFlightSegment(
    regularFlightSegmentEntity: RegularFlightSegmentEntity
  ): RegularFlightSegment {
    return new RegularFlightSegment(
      regularFlightSegmentEntity.id,
      convertToGeo3DPoint(regularFlightSegmentEntity.start),
      convertToGeo3DPoint(regularFlightSegmentEntity.end),
      regularFlightSegmentEntity.horizontal_buffer,
      regularFlightSegmentEntity.vertical_buffer,
      regularFlightSegmentEntity.ground_speed,
      regularFlightSegmentEntity.time_buffer,
      regularFlightSegmentEntity.ordinal!
    );
  }
}
