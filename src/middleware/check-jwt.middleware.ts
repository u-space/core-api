/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextFunction, Request, Response } from "express";
import { readFileSync } from "fs";
import { verify } from "jsonwebtoken";
import { UserDao } from "../daos/user.dao";
import { Role } from "../entities/user";
import { NODE_ENV, PUBLIC_KEY } from "../utils/config.utils";

const ALGORITHM = "RS256";

export const checkJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  //Get the jwt token from the head
  const token: string = (req.headers["auth"] ||
    req.headers.authorization) as string;
  if (!token) return res.sendStatus(401);
  const compliantToken = token.replace("Bearer ", "");
  const bypass = <string>req.headers["bypass"];
  let jwtPayload: any;

  //Try to validate the token and get data
  try {
    if (
      compliantToken === undefined &&
      bypass &&
      (NODE_ENV == "dev" || NODE_ENV == "test")
    ) {
      jwtPayload = {
        username: "admin",
        email: "admin@dronfies.com",
        role: Role.ADMIN, //'admin'
      };
      // console.log(" ********* ******** ******* ")
      // console.log(`Using bypass: this only for dev or test. ${JSON.stringify(jwtPayload)}`)
      // console.log(" ********* ******** ******* ")
    } else {
      const publicKey = readFileSync(PUBLIC_KEY!, "utf8");
      jwtPayload = verify(compliantToken, publicKey, {
        algorithms: [ALGORITHM],
      });
      if (!jwtPayload.role) {
        const userdao = new UserDao();
        const user = await userdao.one(jwtPayload.username);
        jwtPayload.role = user.role;
      }
    }
    res.locals.jwtPayload = jwtPayload;
  } catch (error) {
    //If token is not valid, respond with 401 (unauthorized)
    res.sendStatus(401);
    return;
  }

  //Call the next middleware or controller
  next();
};
