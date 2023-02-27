/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Vertiport } from "../entities/vertiport";
import { getRepository, Repository, SelectQueryBuilder } from "typeorm";
import { VertiportEntity } from "./entities/vertiport.entity";
import {
  addPaginationParamsToQuery,
  convertToVertiport,
  convertToVertiportEntity,
  handleTypeORMError,
  validatePaginationParams2,
} from "./utils";

export class VertiportDao {
  private repository;

  constructor(repository?: Repository<VertiportEntity>) {
    this.repository = repository || getRepository(VertiportEntity);
  }

  async all(
    take = 10,
    skip = 0,
    filterBy?: string,
    filter?: string,
    orderBy = "created_at",
    order = "ASC"
  ): Promise<Vertiport[]> {
    validatePaginationParams2(
      take,
      skip,
      filterBy,
      filter,
      orderBy,
      order,
      ["id", "name"],
      ["created_at", "id", "name", "timeBetweenFlights"]
    );

    try {
      const query: SelectQueryBuilder<VertiportEntity> =
        this.repository.createQueryBuilder("vertiport");

      const filterByNormalized = filterBy ? `vertiport.${filterBy}` : null;
      addPaginationParamsToQuery(
        query,
        take,
        skip,
        filterByNormalized,
        filter,
        `vertiport.${orderBy}`,
        order
      );

      const vertiportEntities: VertiportEntity[] = await query.getMany();

      const result = vertiportEntities.map((entity) =>
        convertToVertiport(entity)
      );
      return result;
    } catch (error) {
      handleTypeORMError(error, "vertiport", filterBy, orderBy);
      throw new Error("handleTypeORMError");
    }
  }

  async save(vertiport: Vertiport): Promise<Vertiport> {
    const vertiportEntity: any = convertToVertiportEntity(vertiport);
    delete vertiportEntity.id;
    const vertiportEntityAdded = await this.repository.save(vertiportEntity);
    const result = convertToVertiport(vertiportEntityAdded);
    return result;
  }

  // -------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------
  // ------------------------------ PRIVATE FUNCTIONS ------------------------------
  // -------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------
}
