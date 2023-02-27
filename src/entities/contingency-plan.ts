/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

// type ContingencyCause =
// "LOST_C2_UPLINK" | "LOST_C2_DOWNLINK" | "LOST_NAV" | "LOST_SAA" | "LOW_FUEL" | "NO_FUEL" | "MECHANICAL_PROBLEM" | "SOFTWARE_PROBLEM" | "ENVIRONMENTAL" | "SECURITY" | "TRAFFIC" | "LOST_USS" | "OTHER" | "ANY"

export enum ContingencyCause {
  LOST_C2_UPLINK = "LOST_C2_UPLINK",
  LOST_C2_DOWNLINK = "LOST_C2_DOWNLINK",
  LOST_NAV = "LOST_NAV",
  LOST_SAA = "LOST_SAA",
  LOW_FUEL = "LOW_FUEL",
  NO_FUEL = "NO_FUEL",
  MECHANICAL_PROBLEM = "MECHANICAL_PROBLEM",
  SOFTWARE_PROBLEM = "SOFTWARE_PROBLEM",
  ENVIRONMENTAL = "ENVIRONMENTAL",
  SECURITY = "SECURITY",
  TRAFFIC = "TRAFFIC",
  LOST_USS = "LOST_USS",
  OTHER = "OTHER",
  ANY = "ANY",
}

export enum ContingencyResponse {
  LANDING = "LANDING",
  LOITERING = "LOITERING",
  RETURN_TO_BASE = "RETURN_TO_BASE",
  OTHER = "OTHER",
}

export enum ContingencyLocationDescription {
  PREPROGRAMMED = "PREPROGRAMMED",
  OPERATOR_UPDATED = "OPERATOR_UPDATED",
  UA_IDENTIFIED = "UA_IDENTIFIED",
  OTHER = "OTHER",
}

@Entity()
export class ContingencyPlan {
  @PrimaryGeneratedColumn()
  "contingency_id": number;
  @Column({ type: "simple-array" })
  "contingency_cause": ContingencyCause[];
  @Column({ type: "varchar" })
  "contingency_response": ContingencyResponse; //"LANDING" | "LOITERING" | "RETURN_TO_BASE" | "OTHER";
  @Column({ type: "geometry" })
  "contingency_polygon": GeoJSON.Polygon;
  @Column({ type: "numeric" })
  "loiter_altitude"?: number; // 'loiter_altitude'?: Altitude;
  @Column({ type: "numeric" })
  "relative_preference"?: number;
  @Column({ type: "varchar" })
  "contingency_location_description": ContingencyLocationDescription; //"PREPROGRAMMED" | "OPERATOR_UPDATED" | "UA_IDENTIFIED" | "OTHER";
  @Column({ type: "simple-array" })
  "relevant_operation_volumes"?: number[]; //Array<number>;
  @Column({ type: "timestamp" })
  "valid_time_begin": string;
  @Column({ type: "timestamp" })
  "valid_time_end": string;
  @Column({ type: "varchar", nullable: true })
  "free_text"?: string;
}
