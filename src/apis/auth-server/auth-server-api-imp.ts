/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import axios from "axios";
import { User } from "../../entities/user";
import { MICROUTM_AUTH_URL } from "../../utils/config.utils";
import ConnectionError from "./errors/connection-error";
import IAuthServerAPI from "./iauth-server-api";

export default class AuthServerAPIImp implements IAuthServerAPI {
  axiosInstance = axios.create({ baseURL: MICROUTM_AUTH_URL, timeout: 60000 });

  async externalAuthUpdateUser(userToUpdate: any) {
    await this.axiosInstance.put("auth/update", userToUpdate);
  }

  async externalAuthUpdatePassword(username: string, password: unknown) {
    await this.axiosInstance.put("auth/password", {
      username,
      password,
    });
  }

  async externalAuthUsersByUsername(dbUsers: unknown[]) {
    const usernames = dbUsers.map((user: any) => user["username"]);
    try {
      return await this.axiosInstance.post("users/users_by_username", {
        usernames,
      });
    } catch (error) {
      if (`${(error as Error).message}`.startsWith("connect ECONNREFUSED")) {
        throw new ConnectionError(`${(error as Error).message}`);
      }
      throw error;
    }
  }

  async createUserExternalAuth(
    insertedDetails: User,
    password: string,
    verified: boolean
  ) {
    return this.axiosInstance.post("auth/signup", {
      username: insertedDetails.username,
      firstName: insertedDetails.firstName,
      lastName: insertedDetails.lastName,
      password,
      email: insertedDetails.email,
      verified: verified,
    });
  }

  async getUserByUsername(username: string): Promise<unknown> {
    return this.axiosInstance.get(`users/${username}`);
  }
}
