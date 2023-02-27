/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  DeleteDateColumn,
} from "typeorm";
import { Operation } from "./operation";

export enum UASVolumeReservationType {
  DYNAMIC_RESTRICTION = "DYNAMIC_RESTRICTION",
  STATIC_ADVISORY = "STATIC_ADVISORY",
}

export enum UASVolumeReservationPermitedUas {
  NOT_SET = "NOT_SET",
  PUBLIC_SAFETY = "PUBLIC_SAFETY",
  SECURITY = "SECURITY",
  NEWS_GATHERING = "NEWS_GATHERING",
  VLOS = "VLOS",
  SUPPORT_LEVEL = "SUPPORT_LEVEL",
  PART_107 = "PART_107",
  PART_101E = "PART_101E",
  PART_107X = "PART_107X",
  RADIO_LINE_OF_SIGHT = "RADIO_LINE_OF_SIGHT",
}

export enum UASVolumeReservationRequiredSupport {
  V2V = "V2V",
  DAA = "DAA",
  ADSB_OUT = "ADSB_OUT",
  ADSB_IN = "ADSB_IN",
  CONSPICUITY = "CONSPICUITY",
  ENHANCED_NAVIGATION = "ENHANCED_NAVIGATION",
  ENHANCED_SAFE_LANDING = "ENHANCED_SAFE_LANDING",
}

export enum UASVolumeReservationCause {
  WEATHER = "WEATHER",
  ATC = "ATC",
  SECURITY = "SECURITY",
  SAFETY = "SAFETY",
  MUNICIPALITY = "MUNICIPALITY",
  OTHER = "OTHER",
}

@Entity()
export class UASVolumeReservation {
  @PrimaryGeneratedColumn("uuid")
  "message_id"?: string;
  @Column({ type: "varchar", nullable: true })
  "uss_name"?: string;
  @Column({ type: "varchar", nullable: true })
  "type"?: UASVolumeReservationType; //"STATIC_ADVISORY" ,"DYNAMIC_RESTRICTION";
  @Column("simple-array", { nullable: true })
  "permitted_uas"?: UASVolumeReservationPermitedUas[];
  @Column("simple-array", { nullable: true })
  "required_support"?: UASVolumeReservationRequiredSupport[];

  @ManyToMany(() => Operation, { nullable: true })
  @JoinTable()
  "permitted_operations"?: Operation[];

  "permitted_gufis"?: Array<string>;

  @Column({ type: "varchar", nullable: true })
  "cause"?: UASVolumeReservationCause;

  @Column("geometry", { nullable: true })
  "geography"?: GeoJSON.Polygon;

  @Column({ type: "timestamp without time zone", nullable: true })
  "effective_time_begin"?: string;
  @Column({ type: "timestamp without time zone", nullable: true })
  "effective_time_end"?: string;
  @Column({ type: "timestamp without time zone", nullable: true })
  "actual_time_end"?: string;

  @Column({ type: "numeric", nullable: true })
  "min_altitude"?: number; //Altitude
  @Column({ type: "numeric", nullable: true })
  "max_altitude"?: number; //Altitude

  @Column({ type: "varchar", nullable: true })
  "reason"?: string;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: "varchar", nullable: true, select: false })
  enaire_layer_id?: string;

  @Column({ type: "varchar", nullable: true, select: false })
  enaire_notam_id?: string;
}
