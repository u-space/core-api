/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Point } from "geojson";

import { OperationVolume } from "./operation-volume";
import { User } from "./user";
import { VehicleReg } from "./vehicle-reg";
import { ContingencyPlan } from "./contingency-plan";
import { NegotiationAgreement } from "./negotiation-agreement";
import { PriorityElements } from "./priority-elements";

/**
 *
    PROPOSED
    This operation is not yet ACCEPTED. It may be awaiting information
    from the operator, it may be in conflict with another ACCEPTED or
    ACTIVATED operation and undergoing a negotiation process, or for
    some other reason it is not yet able to be declared ACCEPTED.
    ACCEPTED
    This operation has been deemed ACCEPTED by the supporting USS. This
    implies that the operation meets the requirements for operating in
    the airspace based on the type of operation submitted.
    ACTIVATED
    This operation is active. The transition from ACCEPTED to ACTIVATED
    is not an announced transition. The transition is implied based on
    the submitted start time of the operation (i.e. the
    effective_time_begin of the first OperationVolume). Note that an
    ACTIVATED operation is not necessarily airborne, but is assumed
    to be "using" the OperationVolumes that it has announced.
    CLOSED
    This operation is closed. It is not airborne and will not become
    airborne again. If the UAS and the crew will fly again, it would
    need to be as a new operation. A USS may announce the closure of any
    operation, but is not required to announce unless the operation was
    ROGUE or NONCONFORMING.
    NONCONFORMING
    See USS Specification for requirements to transition to this state.
    ROGUE
    See USS Specification for requirements to transition to this state.
 */
export enum OperationState {
  PROPOSED = "PROPOSED",
  ACCEPTED = "ACCEPTED",
  ACTIVATED = "ACTIVATED",
  CLOSED = "CLOSED",
  NONCONFORMING = "NONCONFORMING",
  ROGUE = "ROGUE",
  NOT_ACCEPTED = "NOT_ACCEPTED",
  PENDING = "PENDING",
}

export function parseOperationState(str: string): OperationState {
  if (str.toUpperCase() === "PROPOSED") return OperationState.PROPOSED;
  else if (str.toUpperCase() === "ACCEPTED") return OperationState.ACCEPTED;
  else if (str.toUpperCase() === "ACTIVATED") return OperationState.ACTIVATED;
  else if (str.toUpperCase() === "CLOSED") return OperationState.CLOSED;
  else if (str.toUpperCase() === "NONCONFORMING")
    return OperationState.NONCONFORMING;
  else if (str.toUpperCase() === "ROGUE") return OperationState.ROGUE;
  else if (str.toUpperCase() === "NOT_ACCEPTED")
    return OperationState.NOT_ACCEPTED;
  else if (str.toUpperCase() === "PENDING") return OperationState.PENDING;
  throw new Error(`Invalid state (state=${str})`);
}

export enum OperatonFaaRule {
  PART_107 = "PART_107",
  PART_107X = "PART_107X",
  PART_101E = "PART_101E",
  OTHER = "OTHER",
}

@Entity()
export class Operation {
  @PrimaryGeneratedColumn("uuid")
  "gufi": string;

  // Obligatorio - ya no se usa flight_comments como titulo
  @Column({ type: "varchar" })
  "name": string;

  // Owner - a quien le pertenece la operación
  @ManyToOne(() => User, {
    eager: true,
  })
  "owner": User;

  //agregarlos nulleables
  @Column({ type: "varchar", nullable: true })
  "uss_name"?: string;
  @Column({ type: "varchar", nullable: true })
  "discovery_reference"?: string;

  //automaticos, ignorarlos en la entrada
  @CreateDateColumn({ type: "timestamp with time zone" })
  // @Column({ type: "timestamp" })
  "submit_time"?: string;

  // automaticos, ignorarlos en la entrada
  @UpdateDateColumn({ type: "timestamp with time zone" })
  // @Column({ type: "timestamp" })
  "update_time"?: string;

  @Column({ type: "varchar", nullable: true })
  "aircraft_comments"?: string;

  //obligatorio, despues de aplicar trim tiene que tener entre 1 y 255.
  //se usa como frontend como titulo
  @Column({ type: "varchar", nullable: true })
  "flight_comments": string;

  @Column({ type: "varchar", nullable: true })
  "volumes_description"?: string;

  @Column({ type: "varchar", nullable: true })
  "airspace_authorization"?: string;

  //agregar los comentarios sobre la nueva maquina de estados
  @Column({ type: "varchar" })
  "state": OperationState; //"PROPOSED" | "ACCEPTED" | "ACTIVATED" | "CLOSED" | "NONCONFORMING" | "ROGUE";

  @Column("geometry", { nullable: true })
  "controller_location"?: Point;

  @Column("geometry", { nullable: true })
  "gcs_location"?: Point;

  //nulleable
  @Column({ type: "varchar", nullable: true })
  "faa_rule"?: OperatonFaaRule; // "PART_107" | "PART_107X" | "PART_101E" | "OTHER";

  //tiene que tener 1 elemento
  @OneToMany(
    () => OperationVolume,
    (operation_volume) => operation_volume.operation,
    {
      eager: true,
      cascade: true,
    }
  )
  "operation_volumes": OperationVolume[];
  //TODO: later
  // @OneToOne(() => OperationVolume, (operation_volume) => operation_volume.operationUnion, {
  // 	eager: true,
  // 	cascade: true
  // })
  // 'union_volume'?: OperationVolume;

  // 'uas_registrations': Array<UasRegistration>;

  //mandar una lista de ids. controlar que existan y sean del usuario. no vacia
  @ManyToMany(() => VehicleReg, { eager: true })
  @JoinTable()
  uas_registrations?: VehicleReg[];

  //se obtiene automaticamente del token
  @ManyToOne(() => User, {
    eager: true,
  })
  "creator": User;

  @Column({ type: "varchar", nullable: true })
  "contact"?: string;

  @Column({ type: "varchar", nullable: true })
  "contact_phone"?: string;

  //no obligatorio
  @ManyToMany(() => ContingencyPlan, { eager: true, cascade: true })
  @JoinTable()
  "contingency_plans": ContingencyPlan[];

  //no obligatorio
  @ManyToMany(() => NegotiationAgreement, { eager: true, cascade: true })
  @JoinTable()
  "negotiation_agreements"?: NegotiationAgreement[];

  //nulleable
  @Column(() => PriorityElements)
  // @JoinColumn()
  "priority_elements"?: PriorityElements;
}
