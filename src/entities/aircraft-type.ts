/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { vehicleType } from "./vehicle-reg";

@Entity()
export class AircraftType {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: "varchar", nullable: true })
  manufacturer: string; // Marca // brand en fly safe

  @Column({ type: "varchar", nullable: true })
  model: string; // Modelo

  @Column({
    type: "enum",
    enum: vehicleType,
    nullable: true,
  })
  class: vehicleType; // Clase: (Ala fija Multirotor Hibrido VTOL)

  @Column({ type: "varchar", nullable: true })
  mtom: string; // MTOM maximum take of weiht

  @Column({ type: "numeric", nullable: true })
  time_autonomy: number; // Autonomía //FIXME

  @Column({ type: "varchar", nullable: true })
  pilot: string; // AutoPiloto

  @Column({ type: "varchar", nullable: true })
  band: string; // Banda

  @Column({ type: "varchar", nullable: true })
  color: string;

  @Column({ type: "varchar", nullable: true })
  lights: string; // Luces

  @Column({ type: "numeric", nullable: true })
  load_weight: number; // Carga //number? //TODO:: units?

  @Column({ type: "bool", nullable: true })
  vhf: boolean;

  @Column({ type: "varchar", nullable: true })
  visual_front_sensor: string; // Dispositivo Visión Delantera

  @Column({ type: "varchar", nullable: true })
  dimension: string; // Dimensión

  @Column({ type: "varchar", nullable: true })
  energy: string; // Energia impacto

  constructor(
    manufacturer: any,
    model: any,
    classType: any,
    mtom: any,
    time_autonomy: any,
    pilot: any,
    band: any,
    color: any,
    lights: any,
    load_weight: any,
    vhf: any,
    visual_front_sensor: any,
    dimension: any,
    energy: any
  ) {
    this.manufacturer = manufacturer;
    this.model = model;
    this.class = classType;
    this.mtom = mtom;
    this.time_autonomy = time_autonomy;
    this.pilot = pilot;
    this.band = band;
    this.color = color;
    this.lights = lights;
    this.load_weight = load_weight;
    this.vhf = vhf;
    this.visual_front_sensor = visual_front_sensor;
    this.dimension = dimension;
    this.energy = energy;
  }

  // @Column({ nullable: true })
  // payload: string; // Carga de pago (combo)

  // @Column({ nullable: true })
  // camera_sensor: string; // Sensor cámara (precargada según carga de pago)

  // @Column({ nullable: true })
  // camera_focal_distance: string; // Distancia focal (precargada según carga de pago)

  // constructor(props) {

  // }
}
