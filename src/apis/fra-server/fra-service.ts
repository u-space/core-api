/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import axios from "axios";

import { Operation } from "../../entities/operation";
import { FRA_URL } from "../../utils/config.utils";

const postCheckOperationPath = "/flightRequest/operationCheck";

export interface IFlightRequestOperationChecks {
  needAltitude: boolean;
  needNight: boolean;
  needBvlos: boolean;
  needGeozones: any[];
  needCoordinators: any[];
  hasAlitude: boolean;
  hasNight: boolean;
  hasBvlos: boolean;
  hasCoordination: any[];
  validflightRequests: any[];
  failVehicleCheck: boolean;
}

export class FraService {
  private axiosInstance = axios.create({
    baseURL: FRA_URL,
    timeout: 500000,
  });

  public async checkOperationConditions(
    operation: Operation,
    token: string
  ): Promise<IFlightRequestOperationChecks> {
    const responsePositions = await this.axiosInstance.post(
      postCheckOperationPath,
      operation,
      {
        headers: {
          auth: token,
        },
      }
    );
    return responsePositions.data;
  }
}
