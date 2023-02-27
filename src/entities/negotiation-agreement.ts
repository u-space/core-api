/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  BeforeInsert,
  AfterInsert,
} from "typeorm";
import { Operation } from "./operation";

export enum NegotiationAgreementType {
  INTERSECTION = "INTERSECTION",
  REPLAN = "REPLAN",
}

@Entity()
export class NegotiationAgreement {
  @PrimaryGeneratedColumn("uuid")
  "message_id"?: string;
  @Column({ type: "varchar", nullable: true })
  "negotiation_id"?: string;
  @Column({ type: "varchar" })
  "uss_name"?: string;
  @Column({ type: "varchar" })
  "uss_name_of_originator"?: string;
  @Column({ type: "varchar" })
  "uss_name_of_receiver"?: string;

  // @Column()
  @ManyToOne(() => Operation, { nullable: true })
  "gufi_originator"?: Operation; //'gufi_originator' ? : string;

  // @Column()
  @ManyToOne(() => Operation, { nullable: true })
  "gufi_receiver"?: Operation; //'gufi_receiver' ? : string;

  @Column({ type: "varchar" })
  "free_text"?: string;
  @Column({ type: "varchar" })
  "discovery_reference"?: string;
  @Column({ type: "varchar" })
  "type"?: NegotiationAgreementType; //"INTERSECTION" | "REPLAN";

  @BeforeInsert()
  updateNegotiationId() {
    if (this.negotiation_id === undefined) {
      this.negotiation_id = "toUpdate";
    }
  }
  @AfterInsert()
  updateNegotationIdAfterInsert() {
    if (this.negotiation_id === undefined) {
      this.negotiation_id = this.message_id;
    }
  }
}
