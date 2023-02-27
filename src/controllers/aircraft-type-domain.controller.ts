/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AircraftTypeDao } from "../daos/aircraft-type.dao";
import { AircraftType } from "../entities/aircraft-type";

export const getAircraftTypes = async () => {
  const dao = new AircraftTypeDao();
  return await dao.all();
};

export const getAircraftType = async (id: any) => {
  const dao = new AircraftTypeDao();
  return await dao.one(id);
};

export const saveAircraftType = async (aircraftType: AircraftType) => {
  const dao = new AircraftTypeDao();
  return await dao.save(aircraftType);
};
