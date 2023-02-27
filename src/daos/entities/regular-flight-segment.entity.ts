/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Point } from "geojson";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { RegularFlightEntity } from "./regular-flight.entity";

@Entity("regular_flight_segment")
export class RegularFlightSegmentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("geometry")
  start: Point;

  @Column("geometry")
  end: Point;

  @Column({ type: "numeric" })
  horizontal_buffer: number;

  @Column({ type: "numeric" })
  vertical_buffer: number;

  @Column({ type: "numeric" })
  ground_speed: number;

  @Column({ type: "numeric" })
  time_buffer: number;

  @ManyToOne(
    () => RegularFlightEntity,
    (regularFlightEntity) => regularFlightEntity.path,
    {
      onDelete: "CASCADE",
    }
  )
  regular_flight?: RegularFlightEntity;

  @Column({ type: "numeric" })
  ordinal?: number;

  constructor(
    id: string,
    start: Point,
    end: Point,
    horizontal_buffer: number,
    vertical_buffer: number,
    ground_speed: number,
    time_buffer: number,
    regular_flight?: RegularFlightEntity,
    ordinal?: number
  ) {
    this.id = id;
    this.start = start;
    this.end = end;
    this.horizontal_buffer = horizontal_buffer;
    this.vertical_buffer = vertical_buffer;
    this.ground_speed = ground_speed;
    this.time_buffer = time_buffer;
    this.regular_flight = regular_flight;
    this.ordinal = ordinal;
  }
}
