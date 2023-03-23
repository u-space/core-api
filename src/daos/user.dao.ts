/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { User } from "../entities/user";

export default interface IUserDao {
  all(
    status?: string,
    orderProp?: string,
    orderValue?: string,
    take?: number,
    skip?: number,
    filterProp?: string,
    filterValue?: string,
    deleted?: boolean
  ): Promise<{ users: User[]; count: number }>;
  one(username: string): Promise<User>;
  save(user: User): Promise<User>;
  update(user: User): Promise<void>;
  updatePassword(username: string, password: string): Promise<void>;
  disable(username: string): Promise<void>;
  enable(username: string): Promise<void>;
  exists(username: string): Promise<boolean>;
  existsMail(mail: string): Promise<boolean>;
}
