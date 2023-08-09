/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository } from "typeorm";
import { TelemetryEntity } from "./entities/telemetry.entity";
import { Telemetry } from "../entities/telemetry";
import { Operation } from "../entities/operation";
import { VehicleReg } from "../entities/vehicle-reg";
import { Role, User } from "../entities/user";

export class TelemetryDao {
  private telemetryRepository = getRepository(TelemetryEntity);

  // add telemetry to db and return the id of the telemetry
  async addTelemetry(username: string, telemetry: Telemetry): Promise<number> {
    let operation: Operation | undefined = undefined;
    if (telemetry.gufi) {
      operation = new Operation();
      operation.gufi = telemetry.gufi;
    }
    let vehicle: VehicleReg | undefined = undefined;
    if (telemetry.uvin) {
      vehicle = new VehicleReg();
      vehicle.uvin = telemetry.uvin;
    }
    const telEntity = new TelemetryEntity(
      new User(username, "", "", "", Role.PILOT),
      telemetry.timestamp,
      telemetry.lat,
      telemetry.lon,
      telemetry.publicTelemetry,
      operation,
      vehicle,
      telemetry.comments,
      telemetry.heading,
      telemetry.altitudeAbs,
      telemetry.altitudeRel,
      telemetry.inAir
    );
    telEntity.id = undefined;
    const dbResult = await this.telemetryRepository.save(telEntity);
    if (!dbResult.id) {
      throw new Error("Inserted telemetry has no id");
    }
    return dbResult.id;
  }
}
