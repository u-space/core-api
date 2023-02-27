/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Notams {
  @PrimaryGeneratedColumn("uuid")
  message_id?: string;

  @Column({ type: "varchar" })
  text?: string;

  @Column("geometry", { nullable: true })
  "geography"?: GeoJSON.Polygon;

  @Column({ type: "timestamp without time zone" })
  "effective_time_begin"?: string;
  @Column({ type: "timestamp without time zone" })
  "effective_time_end"?: string;
}
