/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Severity } from "./severety";
import { Column } from "typeorm";

export enum PriorityStatus {
  NONE = "NONE",
  PUBLIC_SAFETY = "PUBLIC_SAFETY",
  EMERGENCY_AIRBORNE_IMPACT = "EMERGENCY_AIRBORNE_IMPACT",
  EMERGENCY_GROUND_IMPACT = "EMERGENCY_GROUND_IMPACT",
  EMERGENCY_AIR_AND_GROUND_IMPACT = "EMERGENCY_AIR_AND_GROUND_IMPACT",
}

export class PriorityElements {
  @Column({ type: "varchar", nullable: true })
  "priority_level"?: Severity;
  @Column({ type: "varchar", nullable: true })
  "priority_status": PriorityStatus; //"NONE" | "PUBLIC_SAFETY" | "EMERGENCY_AIRBORNE_IMPACT" | "EMERGENCY_GROUND_IMPACT" | "EMERGENCY_AIR_AND_GROUND_IMPACT";
}
