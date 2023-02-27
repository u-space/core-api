/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Point } from "geojson";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("vertiport")
export class VertiportEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
  })
  public created_at?: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
    onUpdate: "CURRENT_TIMESTAMP(6)",
  })
  public updated_at?: Date;

  @Column({ type: "varchar" })
  name: string;

  @Column("geometry")
  point: Point;

  @Column({ type: "numeric" })
  buffer: number;

  @Column({ type: "varchar" })
  closedHours: string;

  @Column({ type: "numeric" })
  timeBetweenFlights: number;

  constructor(
    id: string,
    name: string,
    point: Point,
    buffer: number,
    closedHours: string,
    timeBetweenFlights: number
  ) {
    this.id = id;
    this.name = name;
    this.point = point;
    this.buffer = buffer;
    this.closedHours = closedHours;
    this.timeBetweenFlights = timeBetweenFlights;
  }
}
