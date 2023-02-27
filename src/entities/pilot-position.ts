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

@Entity()
export class PilotPosition {
  // @PrimaryGeneratedColumn("uuid")
  // message_id?: string;

  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: "numeric" })
  "altitude_gps": number; //Altitude;

  @ManyToOne(() => Operation, {
    eager: false,
    // cascade: ["insert", "update"]
  })
  "gufi": Operation;
  @RelationId((operation: Operation) => operation.gufi) // you need to specify target relation
  "operationId": string;

  @Column("geometry", { nullable: true })
  "location": GeoJSON.Point;

  @Column({ type: "timestamp" })
  "time_sent": string;
}
