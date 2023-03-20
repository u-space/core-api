import { Polygon } from "geojson";
import { NotFoundError } from "../daos/db-errors";
import INotamDao from "../daos/notam.dao";
import { AAANotams } from "../types";
import { InvalidDataError, NoDataError, UnexpectedError } from "./types";

export default class NotamService {
  private notamDao: INotamDao;

  constructor(notamDao: INotamDao) {
    this.notamDao = notamDao;
  }

  async saveNotam(notam: AAANotams): Promise<AAANotams> {
    // verify notam id is undefined
    if (notam.message_id !== undefined)
      throw new InvalidDataError(
        `When you save a notam, message_id must be undefined (message_id=${notam.message_id})`
      );

    // validate notam
    if (notam.effective_time_begin >= notam.effective_time_end) {
      throw new InvalidDataError(
        `Notam effective_time_begin must be < effective_time_end (effective_time_begin=${notam.effective_time_begin}, effective_time_end=${notam.effective_time_end})`
      );
    }

    // save notam
    const savedNotam = await this.notamDao.save(notam);

    // return saved notam
    return savedNotam;
  }

  async getNotams(): Promise<AAANotams[]> {
    return await this.notamDao.all();
  }

  async getNotam(id: string): Promise<AAANotams> {
    try {
      return await this.notamDao.one(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NoDataError((error as NotFoundError).message);
      }
      throw new UnexpectedError((error as Error).message);
    }
  }

  async removeNotam(id: string): Promise<void> {
    try {
      await this.notamDao.remove(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NoDataError((error as NotFoundError).message);
      }
      throw new UnexpectedError((error as Error).message);
    }
  }

  async getNotamByDateAndArea(date: string, polygon: Polygon): Promise<any> {
    return await this.notamDao.getNotamByDateAndArea(date, polygon);
  }
}
