/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { Connection, createConnection } from "typeorm";
import { executeMigration as v0_9_to_v0_10 } from "../dbmigrations/v0_9_to_v0_10";
import { executeMigration as v0_11_to_v0_12 } from "../dbmigrations/v0_11_to_v0_12";
import { logAndRespond200, logAndRespond400, logAndRespond500 } from "./utils";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

export class MigrationController {
  migrations = ["v0_9_to_v0_10", "v0_11_to_v0_12"];

  async executeMigration(req: Request, res: Response) {
    const migrationId = req.params.id;
    if (!this.migrations.includes(migrationId)) {
      return logAndRespond400(res, 404, null);
    }
    const connectionName = req.query.connectionName;
    if (!connectionName) {
      return logAndRespond400(
        res,
        400,
        "connectionName is a mandatory query parameter"
      );
    }
    try {
      const connection = await this.getConnection(`${connectionName}`);
      if (migrationId === "v0_9_to_v0_10") v0_9_to_v0_10(connection);
      else if (migrationId === "v0_11_to_v0_12") v0_11_to_v0_12(connection);
      return logAndRespond200(res, null, [], 200);
    } catch (error) {
      return logAndRespond500(res, 500, error, true);
    }
  }

  private async getConnection(connectionName: string): Promise<Connection> {
    // read ormconfig.json
    let ormconfig: any[];
    try {
      ormconfig = JSON.parse(fs.readFileSync("ormconfig.json"));
    } catch (error) {
      throw new Error("Error reading ormconfig.json");
    }

    // get config object by connectionName
    const connectionConfig = ormconfig.find(
      (conf) => conf.name === connectionName
    );
    if (!connectionConfig) {
      throw new Error(`No connection named '${connectionName}'`);
    }

    // create and return connection
    return await createConnection(connectionConfig);
  }
}
