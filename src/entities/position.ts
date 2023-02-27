/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  RelationId,
} from "typeorm";
import { Operation } from "./operation";
import { VehicleReg } from "./vehicle-reg";

@Entity()
export class Position {
  // @PrimaryGeneratedColumn("uuid")
  // message_id?: string;

  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: "numeric" })
  "altitude_gps": number; //Altitude;
  "altitude_num_gps_satellites": number;
  "comments"?: string;
  "enroute_positions_id": string;

  @ManyToOne(() => Operation, {
    eager: false,
  })
  "gufi": Operation;
  @RelationId((operation: Operation) => operation.gufi) // you need to specify target relation
  "operationId": string;
  "hdop_gps": number;

  @Column("geometry", { nullable: true })
  "location": GeoJSON.Point;
  "time_measured": string;

  @Column({ type: "timestamp with time zone" })
  "time_sent": string;
  "track_bearing": number;
  "track_bearing_reference": "TRUE_NORTH" | "MAGNETIC_NORTH";
  "track_bearing_uom": "DEG";
  "track_ground_speed": number;
  "track_ground_speed_units": "KT" | "KM_H";
  "uss_name": string;
  "discovery_reference"?: string;
  "vdop_gps": number;

  @Column({ type: "numeric", nullable: true })
  "heading"?: number;

  @Column({ type: "bool", nullable: true })
  "added_from_dat_file": boolean;

  @ManyToOne(() => VehicleReg, {
    eager: false,
  })
  "uvin"?: VehicleReg;
}
