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
    CREATE SEQUENCE IF NOT EXISTS public.telemetry_id_seq
        INCREMENT 1
        START 1
        MINVALUE 1
        MAXVALUE 2147483647
        CACHE 1;
      
    CREATE TABLE IF NOT EXISTS public.telemetry
    (
        id integer NOT NULL DEFAULT nextval('telemetry_id_seq'::regclass),
        "timestamp" numeric NOT NULL,
        lat numeric NOT NULL,
        lon numeric NOT NULL,
        public_telemetry boolean NOT NULL,
        comments character varying COLLATE pg_catalog."default",
        heading numeric,
        altitude_abs numeric,
        altitude_rel numeric,
        in_air boolean,
        operation_gufi uuid,
        vehicle_uvin uuid,
        user_username character varying COLLATE pg_catalog."default",
        CONSTRAINT "PK_9b2e5d3feb141269a262aa75fe8" PRIMARY KEY (id),
        CONSTRAINT "FK_81d9a896367d7abd7063c173db9" FOREIGN KEY (vehicle_uvin)
            REFERENCES public.vehicle_reg (uvin) MATCH SIMPLE
            ON UPDATE NO ACTION
            ON DELETE NO ACTION,
        CONSTRAINT "FK_a09106e1b82be5762a698340ff9" FOREIGN KEY (user_username)
            REFERENCES public."user" (username) MATCH SIMPLE
            ON UPDATE NO ACTION
            ON DELETE NO ACTION,
        CONSTRAINT "FK_a308fab1d108dd2462525335ec9" FOREIGN KEY (operation_gufi)
            REFERENCES public.operation (gufi) MATCH SIMPLE
            ON UPDATE NO ACTION
            ON DELETE NO ACTION
    );

    ALTER SEQUENCE public.telemetry_id_seq
        OWNED BY telemetry.id;
    `
  );
}
