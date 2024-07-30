/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Polygon } from "geojson";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export enum Role {
  ADMIN = "ADMIN",
  PILOT = "PILOT",
  MONITOR = "MONITOR",
  COA = "COA",
  REMOTE_SENSOR = "REMOTE_SENSOR",
  AIR_TRAFIC = "AIR_TRAFIC",
}

export function roleValueOf(strRole: string) {
  if (strRole.toUpperCase() === "ADMIN") {
    return Role.ADMIN;
  } else if (strRole.toUpperCase() === "PILOT") {
    return Role.PILOT;
  } else if (strRole.toUpperCase() === "MONITOR") {
    return Role.MONITOR;
  } else if (strRole.toUpperCase() === "COA") {
    return Role.COA;
  } else if (strRole.toUpperCase() === "REMOTE_SENSOR") {
    return Role.REMOTE_SENSOR;
  }
  return undefined;
}

@Entity()
@Unique(["email"])
export class User {
  @PrimaryColumn({ type: "varchar" })
  username: string;

  @Column({ type: "varchar" })
  firstName: string;

  @Column({ type: "varchar" })
  lastName: string;

  @Column({ type: "varchar" })
  email: string;

  @Column({ type: "enum", enum: Role, default: Role.PILOT })
  role: Role;

  @Column("geometry", { nullable: true })
  VolumesOfInterest?: Polygon;

  @Column({ type: "varchar", name: "settingsLangauge" })
  settings?: string;

  extra_fields?: any;

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
  })
  createdAt?: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
    onUpdate: "CURRENT_TIMESTAMP(6)",
  })
  updatedAt?: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: "json", nullable: true })
  extra_fields_json?: object;

  @Column({
    type: "boolean",
    nullable: false,
    default: false,
    name: "can_operate",
  })
  canOperate: boolean;

  verification_token?: string;
  verified?: boolean;

  constructor(
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    role: Role,
    VolumesOfInterest?: Polygon,
    settings?: string,
    extra_fields?: unknown,
    deletedAt?: Date,
    verification_token?: string,
    verified?: boolean,
    canOperate?: boolean
  ) {
    this.username = username;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.verification_token = verification_token;
    this.verified = verified;
    this.role = role;
    this.VolumesOfInterest = VolumesOfInterest;
    this.settings = settings;
    this.extra_fields = extra_fields;
    this.deletedAt = deletedAt;
    this.canOperate = canOperate ? canOperate : false;
  }
}
