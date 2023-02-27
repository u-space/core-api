/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RegularFlightSegmentEntity } from "./regular-flight-segment.entity";
import { VertiportEntity } from "./vertiport.entity";

@Entity("regular_flight")
export class RegularFlightEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
  })
  public created_at?: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
    onUpdate: "CURRENT_TIMESTAMP(6)",
  })
  public updated_at?: Date;

  @ManyToOne(() => VertiportEntity, { eager: true })
  startingPort: VertiportEntity;

  @ManyToOne(() => VertiportEntity, { eager: true })
  endingPort: VertiportEntity;

  @OneToMany(
    () => RegularFlightSegmentEntity,
    (segment) => segment.regular_flight,
    {
      eager: true,
      cascade: true,
    }
  )
  path: Array<RegularFlightSegmentEntity>;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "numeric" })
  vertical_speed: number;

  constructor(
    id: string,
    startingPort: VertiportEntity,
    endingPort: VertiportEntity,
    path: RegularFlightSegmentEntity[],
    name: string,
    verticalSpeed: number
  ) {
    this.id = id;
    this.startingPort = startingPort;
    this.endingPort = endingPort;
    this.path = path;
    this.name = name;
    this.vertical_speed = verticalSpeed;
  }
}
