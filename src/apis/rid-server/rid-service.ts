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
import { REMOTE_ID_URL } from "../../utils/config.utils";

const getAllPositionsPath = "/position";
const getAllPositionsAfterIdPath = "/position/after/";
const getLastPositionPath = "/position/last";
const getPositionsById = "/position/operation/";

export class RidService {
  private axiosInstance = axios.create({
    baseURL: REMOTE_ID_URL,
    timeout: 500000,
  });

  constructor() {}

  public async getPositionsAfterPosition(lastPosition: IResponseRidPosition) {
    const responsePositions = await this.axiosInstance.get(
      getAllPositionsAfterIdPath + lastPosition.id
    );
    const positions = responsePositions.data as IResponseRidPosition[];
    return positions;
  }

  public async getAllPositions() {
    const responsePositions = await this.axiosInstance.get(getAllPositionsPath);
    const positions = responsePositions.data as IResponseRidPosition[];
    return positions;
  }

  public async getLastPosition() {
    const responsePositions = await this.axiosInstance.get(getLastPositionPath);
    const position = responsePositions.data as IResponseRidPosition;
    return position;
  }

  public async getPositionsByOperationId(operationId: string) {
    try {
      const responsePositions = await this.axiosInstance.get(
        getPositionsById + operationId
      );
      const positions = responsePositions.data as IResponseRidPosition[];
      return positions;
    } catch (error) {
      return [];
    }
  }

  async startPooling() {
    console.log("Start pooling position");
    let lastPosition = await this.getLastPosition();
    console.log("Fisrt time get positions, the las is: " + lastPosition.id);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
        .then(async () => {
          const positions = await this.getPositionsAfterPosition(lastPosition);
          if (positions.length > 0) {
            lastPosition = positions[positions.length - 1];
            for (const position of positions) {
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

export function transformToEntityPosition(
  respPosition: IResponseRidPosition
): Position {
  const position = new Position();
  const o = new Operation();
  o.gufi = respPosition.operation_id || "";
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
  position.time_sent = respPosition.timestamp || new Date().toISOString();
  const v = new VehicleReg();
  v.uvin = respPosition.uas_id;
  position.uvin = v;

  return position;
}
