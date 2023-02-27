/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
} from "typeorm";
import { Operation } from "./operation";
import { User } from "./user";

@Entity()
export class Approval {
  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @Column({ type: "varchar", nullable: true })
  comment?: string;

  @OneToOne("Operation", { eager: true })
  @JoinColumn()
  operation?: Operation;

  @ManyToOne("User")
  @JoinColumn()
  user?: User;

  // @Column({type: "timestamp without time zone"})
  @CreateDateColumn({ type: "timestamp without time zone" })
  "time"?: string;

  @Column({ type: "bool" })
  approved?: boolean;
}
