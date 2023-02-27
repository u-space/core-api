/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { FindManyOptions, getRepository, ILike, IsNull, Not } from "typeorm";
import { RSSIdata } from "../../entities/trackers/rssi-data";
import { Tracker } from "../../entities/trackers/tracker";

export class TrackersDao {
  private repository = getRepository(Tracker);
  private RSSIrepository = getRepository(RSSIdata);

  async all(
    isCentral: boolean,
    take?: number,
    skip?: number,
    filterBy?: string,
    filter?: string
  ) {
    const filterObj: FindManyOptions = {};

    filterObj.take = take || 10;
    filterObj.skip = skip || 0;

    if (filterBy && filter) {
      if (!filterObj.where) filterObj.where = {};
      filterObj.where[filterBy] = ILike("%" + filter + "%");
    }

    // filterObj.where = owner ? qb => {
    // 	qb.where('"ownerUsername" = :username', {username: owner})
    // } : baseWhere

    return this.repository.findAndCount(filterObj);
  }

  async one(id: string, isCentral: boolean) {
    const baseWhere = isCentral
      ? {
          vehicle: IsNull(),
          directory: Not(IsNull()),
        }
      : {
          vehicle: Not(IsNull()),
          directory: IsNull(),
        };
    const res = await this.repository.findOne(id, {
      where: baseWhere,
    });
    // I have to do this beacuse ORM returns undefined when not found :(
    if (res === undefined) {
      return null;
    }
    return res;
  }

  async getRSSIData(trackerId: string) {
    return await this.RSSIrepository.find({ where: { tracker: trackerId } });
  }

  async saveRSSIData(entity: any) {
    return await this.RSSIrepository.save(entity);
  }

  async save(entity: any) {
    return this.repository.save(entity);
  }
}
