/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

// export type Role = "admin" | "pilot"

export enum Status {
  UNCONFIRMED = "unconfirmed",
  CONFIRMED = "confirmed",
}

/* DEPRECATED */
@Entity()
export class UserStatus {
  @PrimaryGeneratedColumn()
  id?: string;

  @Column({ type: "varchar", default: "" })
  token?: string;

  @Column({ type: "varchar", default: Status.UNCONFIRMED })
  status?: Status;
}
