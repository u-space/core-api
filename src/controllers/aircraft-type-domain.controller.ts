/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AircraftTypeDaoTypeOrmImp } from "../daos/typeorm-imp/aircraft-type.dao";
import { AircraftType } from "../entities/aircraft-type";
import { AAAAircratType } from "../types";
import { getAircraftTypeService } from "./utils/services-factory.utils";

export const getAircraftTypes = async () => {
  return await getAircraftTypeService().getAircraftTypes();
};

export const getAircraftType = async (id: any) => {
  return await getAircraftTypeService().getAircraftType(id);
};

export const saveAircraftType = async (aircraftType: AAAAircratType) => {
  return await getAircraftTypeService().saveAircraftType(aircraftType);
};
