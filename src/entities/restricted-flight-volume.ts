/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from "typeorm";

@Entity()
export class RestrictedFlightVolume {
  @PrimaryGeneratedColumn("uuid")
  "id"?: string;

  @Column("geometry", { nullable: true })
  "geography": GeoJSON.Polygon;

  // @Column({type: "timestamp without time zone", nullable:true})
  // 'effective_time_begin' ? : string
  // @Column({type: "timestamp without time zone", nullable:true})
  // 'effective_time_end' ? : string
  // @Column({type: "timestamp without time zone", nullable:true})
  // 'actual_time_end' ? : string

  @Column({ type: "numeric", nullable: true })
  "min_altitude": number; //Altitude
  @Column({ type: "numeric", nullable: true })
  "max_altitude": number; //Altitude

  @Column({ type: "varchar" })
  "comments": string;

  @DeleteDateColumn()
  deletedAt?: Date;
}
