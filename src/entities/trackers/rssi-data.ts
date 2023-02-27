/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Entity,
  Column,
  OneToOne,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Position } from "../position";
import { Tracker } from "./tracker";

@Entity()
export class RSSIdata {
  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @OneToOne(() => Position, {
    eager: true,
  })
  @JoinColumn()
  "position": Position;

  @Column({ type: "numeric" })
  "RSSI": number;

  @ManyToOne(() => Tracker, {
    eager: true,
  })
  "tracker": Tracker;
}
