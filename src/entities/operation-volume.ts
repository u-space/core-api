/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Polygon } from "geojson";
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Operation } from "./operation";

@Entity()
export class OperationVolume {
  @PrimaryGeneratedColumn()
  "id"?: number;

  //inicialmente sera 1, lo voy a hardocodear en 0
  @Column({ type: "numeric", default: 0 })
  "ordinal": number;

  //nulleable, que sea uno de los dos valores
  @Column({ type: "varchar", nullable: true })
  "volume_type"?: "TBOV" | "ABOV";

  // nulleable
  @Column({ type: "bool", nullable: true })
  "near_structure"?: boolean;

  //solo crear operaciones al futuro (solo chequear finalizacion)
  //chequear que hora de empezar < hora de fin
  //duracion: 15 minutos y 5hs
  @Column({ type: "timestamp with time zone" })
  "effective_time_begin": string;

  @Column({ type: "timestamp with time zone" })
  "effective_time_end": string;

  //nulleable, se setea automaticamente cuando la operacion pasa a close
  @Column({ type: "timestamp with time zone", nullable: true })
  "actual_time_end"?: string;

  //valor en metros, min -300 y 0
  @Column({ type: "numeric" })
  "min_altitude": number;

  //valor en metros, max 0 y 120mts, 400
  @Column({ type: "numeric" })
  "max_altitude": number;

  //chequeo que este correctamente creado el poligono
  //chequear las coordenadas pasadas
  @Column("geometry", { nullable: true })
  "operation_geography": Polygon;

  @Column({ type: "bool" })
  "beyond_visual_line_of_sight": boolean;

  @ManyToOne(() => Operation, (operation) => operation.operation_volumes, {
    onDelete: "CASCADE",
  })
  operation?: Operation;
}
