/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verify } from "jsonwebtoken";
import { readFileSync } from "fs";
import { NODE_ENV, PUBLIC_KEY } from "../utils/config.utils";

export const authMiddleware = (socket: any, next: any) => {
  const token = socket.handshake.query.token;
  const bypass = socket.handshake.query.bypass;
  //console.log(`Middleware ${JSON.stringify(socket.handshake.query, null, 2)}`)
  let jwtPayload;
  try {
    if (
      token === undefined &&
      bypass &&
      (NODE_ENV == "dev" || NODE_ENV == "test")
    ) {
      jwtPayload = {
        username: "admin",
        email: "admin@dronfies.com",
        role: "admin",
      };
      console.log(`Bypass:::->${JSON.stringify(jwtPayload)}`);
    } else {
      const publicKey = readFileSync(PUBLIC_KEY!, "utf8");
      jwtPayload = verify(token, publicKey, {
        algorithms: ["RS256"],
      });
    }
    socket.jwtPayload = jwtPayload;
    return next();
  } catch (error) {
    console.log(`Token error ${error}`);
    // return;
    return next(new Error("Authentication error"));
  }
};
