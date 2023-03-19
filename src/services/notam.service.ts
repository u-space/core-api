import { NotamDao } from "../daos/notam.dao";
import { AAANotams } from "../types";

export default class NotamService {
  private notamDao = new NotamDao();

  async saveNotam(notam: AAANotams): Promise<AAANotams> {
    // save notam
    const savedNotam = await this.notamDao.save(notam);

    // return saved notam
    return savedNotam;
  }
}
