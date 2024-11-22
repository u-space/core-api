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
  CreateDateColumn,
  JoinTable,
  ManyToMany,
} from "typeorm";
import { User } from "./user";

export enum vehicleType {
  MULTIROTOR = "MULTIROTOR",
  FIXEDWING = "FIXEDWING",
  VTOL = "VTOL",
  OTHER = "OTHER",
}

export function parseVehicleType(str: string): vehicleType {
  if (str.toUpperCase() === "MULTIROTOR") return vehicleType.MULTIROTOR;
  else if (str.toUpperCase() === "FIXEDWING") return vehicleType.FIXEDWING;
  else if (str.toUpperCase() === "VTOL") return vehicleType.VTOL;
  else if (str.toUpperCase() === "OTHER") return vehicleType.OTHER;
  throw new Error(`Invalid type (type=${str})`);
}

export enum VehicleAuthorizeStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  NOT_AUTHORIZED = "NOT_AUTHORIZED",
}

export function parseVehicleAuthorizeStatus(
  str: string
): VehicleAuthorizeStatus {
  if (str.toUpperCase() === "PENDING") return VehicleAuthorizeStatus.PENDING;
  if (str.toUpperCase() === "AUTHORIZED")
    return VehicleAuthorizeStatus.AUTHORIZED;
  if (str.toUpperCase() === "NOT_AUTHORIZED")
    return VehicleAuthorizeStatus.NOT_AUTHORIZED;
  throw new Error(`Invalid status (status=${str})`);
}

@Entity()
export class VehicleReg {
  @PrimaryGeneratedColumn("uuid")
  uvin?: string;

  //fecha de registro, poner automaticamente, ignorar en json
  @CreateDateColumn({ type: "timestamp" })
  "date"?: string;

  @ManyToOne(() => User, {
    eager: true,
  })
  registeredBy?: User;

  @ManyToOne(() => User, {
    eager: true,
  })
  owner?: User;

  @ManyToMany(() => User, { eager: true, nullable: true })
  @JoinTable()
  operators?: User[];

  @Column({ type: "varchar", nullable: true })
  "nNumber": string;

  @Column({ type: "varchar", nullable: true })
  "faaNumber"?: string;

  //obligatiorio string de 1 a 255 caracteres, con trim
  @Column({ type: "varchar" })
  "vehicleName": string;

  @Column({ type: "varchar", nullable: true })
  "manufacturer"?: string;

  @Column({ type: "varchar", nullable: true })
  "model"?: string;

  // example: "Multi-Rotor", definir enum: multirotor, fixedWing, vtol y other
  @Column({ type: "varchar" })
  "class": vehicleType;

  @Column("simple-array", { nullable: true }) //here we store the payload id from payloadTypes array in microutm-entities
  "payload"?: string[];

  //public private
  @Column({ type: "varchar", nullable: true })
  "accessType"?: string;

  @Column({ type: "varchar", nullable: true })
  "vehicleTypeId": string;

  @Column({ type: "varchar", nullable: true })
  "org-uuid": string;

  @Column({ type: "varchar", default: VehicleAuthorizeStatus.PENDING })
  authorized?: VehicleAuthorizeStatus;

  @Column({ type: "bool", default: false, name: "remotesensorvalid" })
  remoteSensorValid?: boolean;

  extra_fields?: any;

  @Column({ type: "json", nullable: true })
  extra_fields_json?: object;
}

export const vehicleRegSchema: any = {
  date: "string",
  owner: "User",
  operators: "User[]",
  nNumber: "string",
  faaNumber: "string",
  vehicleName: "string",
  manufacturer: "string",
  model: "string",
  payload: "string[]",
  class: "vehicleType",
  accesstype: "varchar",
  vehicleTypeId: "string",
  "org-uuid": "string",
  trackerId: "string",
  authorized: "VehicleAuthorizeStatus",
  extra_fields: "IVehicleExtraFields",
  remoteSensorValid: "boolean",
};
