/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { User } from "../../entities/user";
import IAuthServerAPI from "./iauth-server-api";

interface IAuthServerUser {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  verified: boolean;
}

export default class AuthServerAPIMock implements IAuthServerAPI {
  users: IAuthServerUser[] = [
    {
      username: "admin",
      firstName: "Administrador",
      lastName: "Del Sistema",
      password: "adminadmin",
      email: "admin@dronfies.com",
      verified: true,
    },
  ];

  async externalAuthUpdateUser(_userToUpdate: any): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async externalAuthUpdatePassword(
    _username: string,
    _password: any
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async externalAuthUsersByUsername(dbUsers: unknown[]): Promise<unknown> {
    const usernamesReceived = dbUsers.map((user: any) => user["username"]);
    return this.users.filter((user) =>
      usernamesReceived.includes(user.username)
    );
  }
  async createUserExternalAuth(
    insertedDetails: User,
    password: string,
    verified: boolean
  ): Promise<void> {
    if (
      this.users.filter((user) => user.username === insertedDetails.username)
        .length > 0
    ) {
      throw Error("there is a user with the username received");
    }
    this.users.push({
      username: insertedDetails.username,
      firstName: insertedDetails.firstName,
      lastName: insertedDetails.lastName,
      password,
      email: insertedDetails.email,
      verified: verified,
    });
  }
  async getUserByUsername(usernameReceived: string): Promise<unknown> {
    const result = this.users.filter(
      (user) => user.username === usernameReceived
    );
    if (result.length === 0) {
      throw new Error("no user");
    } else if (result.length > 1) {
      throw new Error("more than one user");
    }
    const { username, verified } = result[0];
    return { data: { username, verified }, message: "user_by_username" };
  }
}
