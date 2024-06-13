/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import axios from "axios";

import { sendPositionToMonitor } from "../socket-io/async-browser-comunication";
import { IResponseRidPosition } from "./IResponseRidPosition";
import { Position } from "../../entities/position";
import { VehicleReg } from "../../entities/vehicle-reg";
import { Operation } from "../../entities/operation";

const RID_URL = "https://localhost:3030/";

const getAllPositionsPath = "/position";
const getAllPositionsAfterIdPath = "/position/after/";

export class RidService {
  private axiosInstance = axios.create({
    baseURL: RID_URL,
    timeout: 50000,
  });

  constructor() {
    console.log("RidService::Constructor");
  }

  async startPooling() {
    console.log("Start pooling position");
    const responsePositions = await this.axiosInstance.get(getAllPositionsPath);

    const positions = responsePositions.data as IResponseRidPosition[];
    let lastPosition = positions[positions.length - 1];
    console.log("Fisrt time get positions, the las is: " + lastPosition.id);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
        .then(async () => {
          console.log("Pooling: obteniendo posiciones");
          const responsePositions = await this.axiosInstance.get(
            getAllPositionsAfterIdPath + lastPosition.id
          );
          const positions = responsePositions.data as IResponseRidPosition[];
          if (positions.length > 0) {
            lastPosition = positions[positions.length - 1];
            for (const position of positions) {
              console.log(
                "----->Process position: " + JSON.stringify(position)
              );
              const positionEntity: Position =
                transformToEntityPosition(position);
              sendPositionToMonitor(
                positionEntity,
                position.operator_location,
                true
              );
            }
          }
        })
        .catch((error) => {
          console.log("error: " + error);
        });
    }
  }
}
function transformToEntityPosition(
  respPosition: IResponseRidPosition
): Position {
  console.log();
  const position = new Position();
  const o = new Operation();
  o.gufi = respPosition.operation_id || ":)";
  position.gufi = o;
  position.operationId = respPosition.operation_id || "";
  position.added_from_dat_file = false;
  position.altitude_gps = respPosition.geodetic_altitude || 0;
  position.comments = "from rid";
  position.discovery_reference = "from rid";
  position.hdop_gps = 0;
  position.uss_name = "from rid";
  position.vdop_gps = 0;
  position.heading = respPosition.direction || 0;
  position.location = respPosition.position || {
    coordinates: [0, 0],
    type: "Point",
  };
  position.time_sent = new Date().toISOString(); //respPosition.timestamp?.toISOString() || "";
  const v = new VehicleReg();
  v.uvin = respPosition.uas_id;
  position.uvin = v;

  return position;
}
