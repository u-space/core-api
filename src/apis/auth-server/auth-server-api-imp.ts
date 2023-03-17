/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import axios from "axios";
import { MICROUTM_AUTH_URL } from "../../utils/config.utils";
import ConnectionError from "./errors/connection-error";
import IAuthServerAPI from "./iauth-server-api";

export default class AuthServerAPIImp implements IAuthServerAPI {
  axiosInstance = axios.create({ baseURL: MICROUTM_AUTH_URL, timeout: 10000 });

  // ----------------------------------------------------------------
  // ------------------------ PUBLIC METHODS ------------------------
  // ----------------------------------------------------------------

  async loginWithPassword(
    username: string,
    password: string,
    extraData?: any
  ): Promise<any> {
    return await (
      await this.axiosInstance.post("auth/login", {
        username,
        password,
        extraData,
      })
    ).data.data;
  }
  async loginWithRefreshToken(
    username: string,
    refreshToken: string,
    extraData?: Map<string, string>
  ): Promise<string> {
    const requestBody: any = {
      username,
      refresh_token: refreshToken,
    };
    if (extraData !== undefined) {
      const objExtraData: any = {};
      for (const [key, value] of extraData) {
        objExtraData[key] = value;
      }
      requestBody["extraData"] = objExtraData;
    }
    const axiosResponse = await this.axiosInstance.post(
      "auth/login_session",
      requestBody
    );
    const { accessToken } = axiosResponse.data.data;
    return accessToken;
  }
  async signUp(
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string,
    verified?: boolean
  ): Promise<void> {
    await this.axiosInstance.post("auth/signup", {
      username,
      firstName,
      lastName,
      password,
      email,
      verified,
    });
  }
  async signUpMagic(
    username: string,
    email: string,
    firstName: string,
    lastName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    extraData: Map<string, string>
  ): Promise<string> {
    return this.axiosInstance.post("auth/signup_magic", {
      username,
      email,
      firstName,
      lastName,
    });
  }
  async updatePassword(username: string, password: string): Promise<void> {
    await this.axiosInstance.post(`auth/password`, { username, password });
  }
  async updateUser(
    username: string,
    verified?: boolean,
    disabled?: boolean
  ): Promise<void> {
    await this.axiosInstance.put("auth/update", {
      username,
      verified,
      disabled,
    });
  }
  async getUserByUsername(username: string): Promise<any> {
    return this.axiosInstance.get(`users/${username}`);
  }
  async getUsersByUsernames(usernames: string[]): Promise<any[]> {
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
  async removeUser(username: string): Promise<void> {
    throw new Error("Not implemented");
  }

  // ----------------------------------------------------------------
  // ----------------------- PRIVATE METHODS  -----------------------
  // ----------------------------------------------------------------
}
