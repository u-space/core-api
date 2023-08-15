/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Connection } from "typeorm";

export async function executeMigration(connection: Connection) {
  // add columns
  await connection.query(
    `
    ALTER TABLE IF EXISTS public.telemetry
      ADD COLUMN elevation numeric;

    ALTER TABLE IF EXISTS public.telemetry
      ADD COLUMN elevation_provider character varying;

    ALTER TABLE IF EXISTS public.telemetry
      ADD COLUMN altitude_agl numeric;
    `
  );
}
