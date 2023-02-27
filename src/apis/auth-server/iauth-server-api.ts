/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { User } from "../../entities/user";

export default interface IAuthServerAPI {
  externalAuthUpdateUser(userToUpdate: unknown): Promise<void>;
  externalAuthUpdatePassword(
    username: string,
    password: unknown
  ): Promise<void>;
  externalAuthUsersByUsername(dbUsers: unknown): Promise<unknown>;
  createUserExternalAuth(
    insertedDetails: User,
    password: string,
    verified: boolean
  ): Promise<unknown>;
  getUserByUsername(username: string): Promise<unknown>;
}
