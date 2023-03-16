/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { sign, verify } from "jsonwebtoken";
import { PRIVATE_KEY, PUBLIC_KEY } from "../../utils/config.utils";
import IAuthServerAPI from "./iauth-server-api";
import {
  AccessAndRefreshToken,
  AlreadyDataError,
  AuthServerSession,
  AuthServerUser,
  CorruptedDataError,
  InvalidDataError,
  NoDataError,
} from "./types";

export default class AuthServerAPIMock implements IAuthServerAPI {
  static users: AuthServerUser[] = [
    {
      id: "2a8f68d6-c53d-43f2-9006-15d75a7eff34",
      username: "adminuser",
      firstName: "Admin",
      lastName: "User",
      password: "adminadmin",
      email: "admin@user.com",
      verified: true,
      disabled: false,
      sessions: [],
    },
  ];
  static sessions: AuthServerSession[] = [];

  // ----------------------------------------------------------------
  // ------------------------ PUBLIC METHODS ------------------------
  // ----------------------------------------------------------------

  async loginWithPassword(
    username: string,
    password: string,
    extraData?: Map<string, string>
  ): Promise<AccessAndRefreshToken> {
    // search the user by username
    const filteredUsers = AuthServerAPIMock.users.filter(
      (u) => u.username === username
    );
    if (filteredUsers.length === 0) {
      throw new NoDataError(
        `There is no user with the username received (username=${username})`
      );
    } else if (filteredUsers.length > 1) {
      throw new CorruptedDataError(
        `There is more than one user with the username received (username=${username})`
      );
    }
    const user = filteredUsers[0];

    // get user sessions
    user.sessions = AuthServerAPIMock.sessions.filter(
      (s) => s.userId === user.id
    );

    // verify user is not disabled
    if (user.disabled)
      throw new NoDataError(`User is disabled (username=${user.username})`);

    // verify user password is correct
    if (user.password !== password)
      throw new NoDataError("Password is not correct");

    // verify user is verified
    if (!user.verified)
      throw new NoDataError(`User is not verified (username=${user.username})`);

    // TODO: clean old user sessions

    // create access token
    const accessToken = this.createToken(user, 60 * 60, extraData);

    // create refresh token
    const refreshToken = this.createToken(user, 7 * 24 * 60 * 60);

    // add new session
    AuthServerAPIMock.sessions.push({
      id: uuidv4(),
      userId: user.id,
      refreshToken,
    });

    // return
    return {
      accessToken,
      refreshToken,
    };
  }

  async loginWithRefreshToken(
    username: string,
    refreshToken: string,
    extraData?: any
  ): Promise<string> {
    // decode token
    let tokenDecoded: any;
    try {
      tokenDecoded = this.verifyToken(refreshToken);
    } catch (error) {
      throw new InvalidDataError("Invalid token");
    }

    // verify username in token is correct
    if (tokenDecoded.username !== username) {
      throw new InvalidDataError(
        "The refresh token does not belong to the user"
      );
    }

    // search the user by username
    const filteredUsers = AuthServerAPIMock.users.filter(
      (u) => u.username === username
    );
    if (filteredUsers.length === 0) {
      throw new NoDataError(
        `There is no user with the username received (username=${username})`
      );
    } else if (filteredUsers.length > 1) {
      throw new CorruptedDataError(
        `There is more than one user with the username received (username=${username})`
      );
    }
    const user = filteredUsers[0];

    // verify user is not disabled
    if (user.disabled)
      throw new NoDataError(`User is disabled (username=${user.username})`);

    // verify user is verified
    if (!user.verified)
      throw new NoDataError(`User is not verified (username=${user.username})`);

    // get user sessions
    const userSessions = AuthServerAPIMock.sessions.filter(
      (session) => session.refreshToken === refreshToken
    );
    if (userSessions.length === 0) {
      throw new NoDataError(
        "There is no session for the refresh token received"
      );
    }

    // TODO: clean old user sessions

    // return access token
    const accessToken = this.createToken(user, 60 * 60, extraData);
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
    // verify there is no user with the username or email received
    const userFound = AuthServerAPIMock.users.find(
      (user) => user.username === username || user.email === email
    );
    if (userFound !== undefined) {
      throw new AlreadyDataError(
        `There is a user with the username or email received (username=${username}, email=${email})`
      );
    }

    // add the user
    const userToAdd = {
      id: uuidv4(),
      username: username,
      firstName: firstName,
      lastName: lastName,
      password: password,
      email: email,
      verified: verified !== undefined ? verified : false,
      disabled: false,
    };
    AuthServerAPIMock.users.push(userToAdd);
  }
  async signUpMagic(
    username: string,
    email: string,
    firstName: string,
    lastName: string,
    extraData: Map<string, string>
  ): Promise<string> {
    // verify there is no user with the username or email received
    const userFound = AuthServerAPIMock.users.find(
      (user) => user.username === username || user.email === email
    );
    if (userFound !== undefined) {
      throw new AlreadyDataError(
        `There is a user with the username or email received (username=${username}, email=${email})`
      );
    }

    // add the user
    const userToAdd = {
      id: uuidv4(),
      username: username,
      firstName: firstName,
      lastName: lastName,
      password: "",
      email: email,
      verified: false,
      disabled: false,
    };
    AuthServerAPIMock.users.push(userToAdd);

    // return access token
    const accessToken = this.createToken(userToAdd, 60 * 60, extraData);
    return accessToken;
  }
  async updatePassword(username: string, password: string): Promise<void> {
    const filteredUsers = AuthServerAPIMock.users.filter(
      (u) => u.username === username
    );
    if (filteredUsers.length === 0)
      throw new NoDataError(
        `There is no user with the username received (username=${username})`
      );
    else if (filteredUsers.length > 1)
      throw new CorruptedDataError(
        `There are more than one user with the username received (username=${username})`
      );
    filteredUsers[0].password = password;
  }
  async updateUser(
    username: string,
    verified?: boolean,
    disabled?: boolean
  ): Promise<void> {
    if (verified === undefined && disabled === undefined) {
      throw new InvalidDataError(
        `'verified' and 'disabled' can not be both undefined (verified=${verified}, disabled=${disabled})`
      );
    }
    const filteredUsers = AuthServerAPIMock.users.filter(
      (u) => u.username === username
    );
    if (filteredUsers.length === 0)
      throw new NoDataError(
        `There is no user with the username received (username=${username})`
      );
    else if (filteredUsers.length > 1)
      throw new CorruptedDataError(
        `There are more than one user with the username received (username=${username})`
      );
    if (verified !== undefined) filteredUsers[0].verified = verified;
    if (disabled !== undefined) filteredUsers[0].disabled = disabled;
  }

  async getUserByUsername(usernameReceived: string): Promise<any> {
    const result = AuthServerAPIMock.users.filter(
      (user) => user.username === usernameReceived
    );
    if (result.length === 0) {
      throw new NoDataError("No user");
    } else if (result.length > 1) {
      throw new CorruptedDataError("More than one user");
    }
    const { username, verified } = result[0];
    return { data: { username, verified }, message: "user_by_username" };
  }
  async getUsersByUsernames(usernames: string[]): Promise<AuthServerUser[]> {
    return AuthServerAPIMock.users.filter((user) =>
      usernames.includes(user.username)
    );
  }

  // ----------------------------------------------------------------
  // ----------------------- PRIVATE METHODS  -----------------------
  // ----------------------------------------------------------------

  private createToken(
    user: AuthServerUser,
    expiresInSeconds: number,
    extraData?: Map<string, string>
  ): string {
    const dataStoredInToken: any = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    if (extraData !== undefined) {
      for (const key of extraData.keys()) {
        dataStoredInToken[key] = extraData.get(key);
      }
    }
    const privateKey = fs.readFileSync(PRIVATE_KEY!, "utf8");

    return sign(dataStoredInToken, privateKey, {
      expiresIn: expiresInSeconds,
      algorithm: "RS256",
    });
  }

  private verifyToken(token: string): any {
    const publicKey = fs.readFileSync(PUBLIC_KEY!, "utf8");
    return verify(token, publicKey);
  }
}
