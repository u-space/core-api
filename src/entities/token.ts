/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity()
export class Token {
  @PrimaryColumn({ type: "varchar" })
  username?: string;

  @Column({ type: "varchar" })
  token?: string;
}
