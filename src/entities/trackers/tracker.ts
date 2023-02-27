/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Entity, Column, ManyToOne, PrimaryColumn } from "typeorm";
import { VehicleReg } from "../vehicle-reg";

@Entity()
export class Tracker {
  @PrimaryColumn({ type: "varchar" })
  hardware_id?: string;

  @ManyToOne(() => VehicleReg, {
    eager: true,
    nullable: true,
  })
  "vehicle": VehicleReg;

  @Column({
    type: "jsonb",
    array: false,
    default: () => "'[]'",
    nullable: true,
  })
  "directory": Array<{ endpoint: string; uvin: string }>;
}
