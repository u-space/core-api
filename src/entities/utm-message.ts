/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Operation } from "./operation";
import { Severity } from "./severety";

export { Severity } from "./severety";

export enum message_type {
  UNPLANNED_LANDING = "UNPLANNED_LANDING",
  UNCONTROLLED_LANDING = "UNCONTROLLED_LANDING",
  OPERATION_NONCONFORMING = "OPERATION_NONCONFORMING",
  OPERATION_ROGUE = "OPERATION_ROGUE",
  OPERATION_CONFORMING = "OPERATION_CONFORMING",
  OPERATION_CLOSED = "OPERATION_CLOSED",
  CONTINGENCY_PLAN_INITIATED = "CONTINGENCY_PLAN_INITIATED",
  CONTINGENCY_PLAN_CANCELLED = "CONTINGENCY_PLAN_CANCELLED",
  PERIODIC_POSITION_REPORTS_START = "PERIODIC_POSITION_REPORTS_START",
  PERIODIC_POSITION_REPORTS_END = "PERIODIC_POSITION_REPORTS_END",
  UNAUTHORIZED_AIRSPACE_PROXIMITY = "UNAUTHORIZED_AIRSPACE_PROXIMITY",
  UNAUTHORIZED_AIRSPACE_ENTRY = "UNAUTHORIZED_AIRSPACE_ENTRY",
  OTHER_SEE_FREE_TEXT = "OTHER_SEE_FREE_TEXT",
}

@Entity()
export class UTMMessage {
  @PrimaryGeneratedColumn("uuid")
  message_id?: string;
  @Column({ type: "varchar" })
  uss_name?: string;

  @Column({ type: "varchar", nullable: true })
  discovery_reference?: string;

  @ManyToOne(() => Operation)
  operation?: Operation;

  gufi?: string;

  @Column({ type: "timestamp" })
  time_sent?: string;

  @Column({ type: "varchar" })
  severity?: Severity;

  @Column({ type: "varchar" })
  message_type?:
    | "UNPLANNED_LANDING"
    | "UNCONTROLLED_LANDING"
    | "OPERATION_NONCONFORMING"
    | "OPERATION_ROGUE"
    | "OPERATION_CONFORMING"
    | "OPERATION_CLOSED"
    | "CONTINGENCY_PLAN_INITIATED"
    | "CONTINGENCY_PLAN_CANCELLED"
    | "PERIODIC_POSITION_REPORTS_START"
    | "PERIODIC_POSITION_REPORTS_END"
    | "UNAUTHORIZED_AIRSPACE_PROXIMITY"
    | "UNAUTHORIZED_AIRSPACE_ENTRY"
    | "OTHER_SEE_FREE_TEXT";
  // last_known_position?: Position;
  // contingency?: ContingencyPlan;
  @Column({ type: "varchar", nullable: true })
  prev_message_id?: string;
  @Column({ type: "varchar" })
  free_text?: string;
  // @Column()
  callback?: string;
}
