/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { DataSource } from "typeorm";
import { Notams } from "../../entities/notams";
import { Polygon } from "geojson";
import { DataBaseError, NotFoundError } from "../db-errors";
import { TypeOrmErrorType } from "../type-orm-error-type";
import { AAANotams } from "../../types";
import {
  convertAAANotamsToNotams,
  convertNotamsToAAANotams,
} from "../utils/notam.utils";
import INotamDao from "../notam.dao";

export class NotamDaoTypeOrmImp implements INotamDao {
  private dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "jjcetraro",
    password: "tribus1234",
    database: "test_core",
    synchronize: false,
    dropSchema: false,
    logging: false,
    ssl: false,
    entities: [
      "/Users/jjcetraro/workspace/dronfies/core2/src/entities/**/*.ts",
    ],
    migrations: [
      "/Users/jjcetraro/workspace/dronfies/core2/src/migration/**/*.ts",
    ],
    subscribers: [
      "/Users/jjcetraro/workspace/dronfies/core2/src/subscriber/**/*.ts",
    ],
  });

  constructor(dataSource?: DataSource) {
    if (dataSource !== undefined) {
      this.dataSource = dataSource;
    }
  }

  async all(): Promise<AAANotams[]> {
    await this.initializeDataSource();
    try {
      const dbNotams = await this.dataSource.manager.find(Notams);
      return dbNotams.map((dbNotam) => convertNotamsToAAANotams(dbNotam));
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute NotamDao.all()",
        error
      );
    }
  }

  async one(message_id: string): Promise<AAANotams> {
    await this.initializeDataSource();
    try {
      const dbResult = await this.dataSource.manager.findOneOrFail(Notams, {
        where: { message_id },
      });
      return convertNotamsToAAANotams(dbResult);
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no notam with the "message_id" received (message_id=${message_id})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute NotamDao.one(${message_id})`,
          error
        );
      }
    }
  }

  async save(notam: AAANotams): Promise<AAANotams> {
    await this.initializeDataSource();
    try {
      const notamEntity = await this.dataSource.manager.save(
        Notams,
        convertAAANotamsToNotams(notam)
      );
      return convertNotamsToAAANotams(notamEntity);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute NotamDao.save(entity)",
        error
      );
    }
  }

  async remove(id: string) {
    await this.initializeDataSource();
    const userToRemove: any = await this.dataSource.manager.findOne(Notams, {
      where: { message_id: id },
    });
    await this.dataSource.manager.remove(Notams, userToRemove);
  }

  // async getNotamByVolume(volume : OperationVolume){
  //     return this.repository
  //     .createQueryBuilder("notams")
  //     .where("(tsrange(notams.\"effective_time_begin\", notams.\"effective_time_end\") && tsrange(:date_begin, :date_end) ) "
  //     + " AND (ST_Intersects(notams.\"geography\" ,ST_GeomFromGeoJSON(:geom)))")
  //     .setParameters({
  //         date_begin : volume.effective_time_begin,
  //         date_end : volume.effective_time_end,
  //         geom: JSON.stringify(volume.operation_geography)
  //     })
  //     .getMany()
  // }

  async getNotamByDateAndArea(date: string, polygon: Polygon) {
    await this.initializeDataSource();
    const params: any = {};
    const conditions = [];
    if (date) {
      const dateCondition =
        '( :date ::timestamp <@ tsrange(notams."effective_time_begin", notams."effective_time_end") )';
      // let dateCondition = "( tsrange(notams.\"effective_time_begin\", notams.\"effective_time_end\") <@  :date  )"
      conditions.push(dateCondition);
      params["date"] = new Date(date);
    }
    if (polygon) {
      const polygonCOndition =
        '(ST_Intersects(notams."geography" ,ST_GeomFromGeoJSON(:geom)))';
      conditions.push(polygonCOndition);
      params["geom"] = JSON.stringify(polygon);
    }

    return await this.dataSource.manager
      .createQueryBuilder(Notams, "notams")
      .where(conditions.join(" AND "))
      .setParameters(params)
      .getMany();
  }

  private async initializeDataSource() {
    if (!this.dataSource.isInitialized) {
      this.dataSource = await this.dataSource.initialize();
    }
  }
}
