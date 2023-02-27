/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository } from "typeorm";
import { UserStatus } from "../entities/user-status";

export class UserStatusDao {
  private userRepository = getRepository(UserStatus);

  // async all() {
  //     return this.userRepository.find();
  // }

  // async one(username : string) {
  //     // console.log(`username: ${username}`)
  //     return this.userRepository.findOneOrFail(username);
  // }

  async save(status: UserStatus) {
    // console.log(`Save user: ${JSON.stringify(user)}`)
    const s = await this.userRepository.save(status);
    // let u = await this.userRepository.save(user);
    return s;
  }

  // async remove(username : string) {
  //     let userToRemove = await this.userRepository.findOne(username);
  //     await this.userRepository.remove(userToRemove);
  // }
}
