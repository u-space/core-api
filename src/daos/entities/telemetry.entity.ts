/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Operation } from "../../entities/operation";
import { VehicleReg } from "../../entities/vehicle-reg";
import { User } from "../../entities/user";

@Entity("telemetry")
export class TelemetryEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: "numeric", name: "timestamp", nullable: false })
  timestamp: number;

  @Column({ type: "numeric", name: "lat", nullable: false })
  lat: number;

  @Column({ type: "numeric", name: "lon", nullable: false })
  lon: number;

  @Column({ type: "boolean", name: "public_telemetry", nullable: false })
  publicTelemetry: boolean;

  @ManyToOne(() => Operation)
  @JoinColumn({ name: "operation_gufi" })
  operation?: Operation;

  @ManyToOne(() => VehicleReg)
  @JoinColumn({ name: "vehicle_uvin" })
  vehicle?: VehicleReg;

  @Column({ type: "varchar", name: "comments", nullable: true })
  comments?: string;

  @Column({ type: "numeric", name: "heading", nullable: true })
  heading?: number;

  @Column({ type: "numeric", name: "altitude_abs", nullable: true })
  altitudeAbs?: number;

  @Column({ type: "numeric", name: "altitude_rel", nullable: true })
  altitudeRel?: number;

  @Column({ type: "boolean", name: "in_air", nullable: true })
  inAir?: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_username" })
  user: User;

  @Column({ type: "numeric", name: "elevation", nullable: true })
  elevation?: number;

  @Column({ type: "varchar", name: "elevation_provider", nullable: true })
  elevationProvider?: string;

  @Column({ type: "numeric", name: "altitude_agl", nullable: true })
  altitudeAGL?: number;

  constructor(
    user: User,
    timestamp: number,
    lat: number,
    lon: number,
    publicTelemetry: boolean,
    operation?: Operation,
    vehicle?: VehicleReg,
    comments?: string,
    heading?: number,
    altitudeAbs?: number,
    altitudeRel?: number,
    inAir?: boolean,
    elevation?: number,
    elevationProvider?: string,
    altitudeAGL?: number,
    id?: number
  ) {
    this.user = user;
    this.timestamp = timestamp;
    this.lat = lat;
    this.lon = lon;
    this.publicTelemetry = publicTelemetry;
    this.operation = operation;
    this.vehicle = vehicle;
    this.comments = comments;
    this.heading = heading;
    this.altitudeAbs = altitudeAbs;
    this.altitudeRel = altitudeRel;
    this.inAir = inAir;
    this.elevation = elevation;
    this.elevationProvider = elevationProvider;
    this.altitudeAGL = altitudeAGL;
    this.id = id;
  }
}
