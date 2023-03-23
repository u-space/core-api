import IAircraftTypeDao from "../daos/aircraft-type.dao";
import { AAAAircratType } from "../types";
import { InvalidDataError } from "./types";

export default class AircraftTypeService {
  private aircraftTypeDao: IAircraftTypeDao;

  constructor(aircraftTypeDao: IAircraftTypeDao) {
    this.aircraftTypeDao = aircraftTypeDao;
  }

  async saveAircraftType(
    aircraftType: AAAAircratType
  ): Promise<AAAAircratType> {
    // verify notam id is undefined
    if (aircraftType.id !== undefined)
      throw new InvalidDataError(
        `When you save an aircraft type, id must be undefined (id=${aircraftType.id})`
      );

    return await this.aircraftTypeDao.save(aircraftType);
  }

  async getAircraftTypes(): Promise<AAAAircratType[]> {
    return await this.aircraftTypeDao.all();
  }

  async getAircraftType(id: number): Promise<AAAAircratType> {
    return await this.aircraftTypeDao.one(id);
  }
}
