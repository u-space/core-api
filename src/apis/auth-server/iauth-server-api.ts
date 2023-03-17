/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AccessAndRefreshToken, AuthServerUser } from "./types";

export default interface IAuthServerAPI {
  loginWithPassword(
    username: string,
    password: string,
    extraData?: Map<string, string>
  ): Promise<AccessAndRefreshToken>;
  loginWithRefreshToken(
    username: string,
    refreshToken: string,
    extraData?: any
  ): Promise<string>;
  signUp(
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string,
    verified?: boolean
  ): Promise<void>;
  signUpMagic(
    username: string,
    email: string,
    firstName: string,
    lastName: string,
    extraData: Map<string, string>
  ): Promise<string>;
  updatePassword(username: string, password: string): Promise<void>;
  updateUser(
    username: string,
    verified?: boolean,
    disabled?: boolean
  ): Promise<void>;
  getUserByUsername(username: string): Promise<any>;
  getUsersByUsernames(usernames: string[]): Promise<AuthServerUser[]>;
  removeUser(username: string): Promise<void>;
}
