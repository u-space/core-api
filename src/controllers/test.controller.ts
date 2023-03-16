/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { Role, User } from "../entities/user";
import { EntityManager, getManager, getRepository } from "typeorm";
import { VehicleReg, vehicleType } from "../entities/vehicle-reg";
import { UASVolumeReservation } from "../entities/uas-volume-reservation";
import { Operation, OperationState } from "../entities/operation";
import { RestrictedFlightVolume } from "../entities/restricted-flight-volume";
import { Polygon } from "geojson";
import { MOCK_AUTH_SERVER_API } from "../utils/config.utils";
import AuthServerAPIFactory from "../apis/auth-server/auth-server-api-factory";

export default class TestController {
  tablesName = [
    "aircraft_type",
    "approval",
    "contingency_plan",
    "document",
    "negotiation_agreement",
    "notams",
    "operation",
    "operation_contingency_plans_contingency_plan",
    "operation_negotiation_agreements_negotiation_agreement",
    "operation_uas_registrations_vehicle_reg",
    "operation_volume",
    "pilot_position",
    "position",
    "regular_flight",
    "regular_flight_segment",
    "restricted_flight_volume",
    "rss_idata",
    "token",
    "tracker",
    "uas_volume_reservation",
    "uas_volume_reservation_permitted_operations_operation",
    "vehicle_reg",
    "user",
    "user_status",
    "utm_message",
    "vehicle_reg_operators_user",
    "vertiport",
  ];

  async initDB(req: Request, res: Response) {
    // clear db
    const manager: EntityManager = getManager();
    for (let i = 0; i < this.tablesName.length; i++) {
      await manager.query(`DELETE FROM "${this.tablesName[i]}"`);
    }

    // check MOCK_AUTH_SERVER_API === true
    if (MOCK_AUTH_SERVER_API !== "true") {
      return res.status(500).send({
        message: `MOCK_AUTH_SERVER_API must be true (MOCK_AUTH_SERVER_API=${MOCK_AUTH_SERVER_API})`,
      });
    }

    // get IAuthServerAPI
    const authServerAPI = AuthServerAPIFactory.getAuthServerAPI(true);

    // add admin user
    const adminUser = new User(
      "adminuser",
      "Admin",
      "User",
      "admin@user.com",
      Role.ADMIN,
      ""
    );
    adminUser.verified = true;
    await authServerAPI.signUp(
      adminUser.username,
      "adminadmin",
      adminUser.email,
      adminUser.firstName,
      adminUser.lastName,
      adminUser.verified
    );
    await getRepository(User).save(adminUser);

    // add rfvs
    /*const geography: { type: "Polygon"; coordinates: any[] } = {
      type: "Polygon",
      coordinates: [
        [
          [-54, -31],
          [-53, -31],
          [-53, -30],
          [-54, -31],
        ],
      ],
    };
    await this.addRFV("RFV 1", 0, 120, geography);

    // add vehicles
    await this.addVehicle(
      "Test Vehicle",
      vehicleType.MULTIROTOR,
      userArmandoMcdonalid
    );

    // add operations
    await this.addOperation(
      "Test Operation",
      OperationState.ACCEPTED,
      userArmandoMcdonalid
    );

    // add uvrs
    await this.addUVR();*/

    // respond
    return res.sendStatus(200);
  }

  // ---------------------------------------------------------
  // -------------------- PRIVATE METHODS --------------------
  // ---------------------------------------------------------

  private async addOperation(
    name: string,
    state: OperationState,
    owner: User
  ): Promise<void> {
    const operation = new Operation();
    operation.name = name;
    operation.state = state;
    operation.owner = owner;
    await getRepository(Operation).save(operation);
  }

  private async addRFV(
    comments: string,
    min_altitude: number,
    max_altitude: number,
    geography: Polygon
  ): Promise<void> {
    const rfv = new RestrictedFlightVolume();
    rfv.comments = comments;
    rfv.min_altitude = min_altitude;
    rfv.max_altitude = max_altitude;
    rfv.geography = geography;
    await getRepository(RestrictedFlightVolume).save(rfv);
  }

  private async addVehicle(
    name: string,
    type: vehicleType,
    owner: User
  ): Promise<void> {
    const vehicle = new VehicleReg();
    vehicle.vehicleName = name;
    vehicle.class = type;
    vehicle.owner = owner;
    await getRepository(VehicleReg).save(vehicle);
  }

  private async addUVR(): Promise<void> {
    const uvr = new UASVolumeReservation();
    await getRepository(UASVolumeReservation).save(uvr);
  }
}
