/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository } from "typeorm";
import { Token } from "../entities/token";

export class TokenDao {
  private tokenRepository = getRepository(Token);

  async one(username: string) {
    return this.tokenRepository.findOneOrFail(username);
  }

  async save(token: Token) {
    return await this.tokenRepository.save(token);
  }

  async remove(username: string) {
    const tokenToRemove: any = await this.tokenRepository.findOne(username);
    await this.tokenRepository.remove(tokenToRemove);
  }
}
