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
  users: IAuthServerUser[] = [];

  async externalAuthUpdateUser(userToUpdate: any): Promise<void> {
    const newUsers = [];
    let userFound = false;
    for (let i = 0; i < this.users.length; i++) {
      const currentUser = this.users[i];
      if (currentUser.username === userToUpdate) {
        newUsers.push({
          username: userToUpdate.username,
          firstName: userToUpdate.firstName,
          lastName: userToUpdate.lastName,
          password: userToUpdate.password,
          email: userToUpdate.email,
          verified: userToUpdate.verified,
        });
        userFound = true;
      } else {
        newUsers.push(currentUser);
      }
    }
    if (!userFound)
      throw new Error(
        `There is no user with the username received (username=${userToUpdate.username})`
      );
    this.users = newUsers;
  }
  async externalAuthUpdatePassword(
    username: string,
    password: any
  ): Promise<void> {
    let userFound = false;
    for (let i = 0; i < this.users.length; i++) {
      const currentUser = this.users[i];
      if (currentUser.username === username) {
        currentUser.password = password;
        userFound = true;
      }
    }
    if (!userFound)
      throw new Error(
        `There is no user with the username received (username=${username})`
      );
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
