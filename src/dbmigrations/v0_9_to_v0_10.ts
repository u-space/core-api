/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Connection } from "typeorm";

export async function executeMigration(connection: Connection) {
  // add columns
  await connection.query(
    "ALTER TABLE operation ADD COLUMN begin timestamp with time zone"
  );
  await connection.query(
    `ALTER TABLE operation ADD COLUMN "end" timestamp with time zone`
  );

  // fetch all operations
  const operationsIds = (
    (await connection.query("SELECT gufi FROM operation")) as any[]
  ).map((obj) => obj.gufi);

  for (const operationId of operationsIds) {
    // fetch volumes begin and end
    const volumesBeginEnd = await connection.query(
      `SELECT effective_time_begin, effective_time_end FROM operation_volume WHERE "operationGufi" = '${operationId}'`
    );
    let begin: number = Number.MAX_VALUE;
    let end: number = -Number.MAX_VALUE;
    for (const volumeBeginEnd of volumesBeginEnd) {
      begin = Math.min(
        begin,
        new Date(volumeBeginEnd.effective_time_begin).getTime()
      );
      end = Math.max(
        end,
        new Date(volumeBeginEnd.effective_time_end).getTime()
      );
    }
    const updateQuery = `UPDATE operation SET begin='${new Date(
      begin
    ).toISOString()}', "end"='${new Date(
      end
    ).toISOString()}' WHERE gufi='${operationId}'`;
    await connection.query(updateQuery);
    console.log(`[EXECUTED] ${updateQuery}`);
  }
}
