/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { OperationDao } from "../../../daos/operation.dao";
import { InvalidDataError, NotFoundError } from "../../../daos/db-errors";
import { getElevation } from "../../../controllers/external-services.controller";
import { getgufiPosition } from "../model/get-gufi-position";
import * as mqtt from "mqtt";
import { getgufiResponse } from "../model/get-gufi-response";
import GeneralUtils from "../../../utils/general.utils";
import Joi from "joi";
import { VehicleReg } from "../../../entities/vehicle-reg";
import { generateFeatureFromExpress } from "../../../services/express-operation.service";
import { User } from "../../../entities/user";
import { UserDao } from "../../../daos/user.dao";
import { Operation, OperationState } from "../../../entities/operation";
import { PriorityStatus } from "../../../entities/priority-elements";
import { Severity } from "../../../types";
import { OperationVolume } from "../../../entities/operation-volume";
import { Polygon } from "geojson";
import { TRY_TO_ACTIVATE_NEW_OPERATIONS } from "../../../utils/config.utils";
import { TrackersDao } from "../../../daos/trackers/tracker.dao";
import { isNullOrUndefined } from "util";

export class MQTTOperationController {
  private dao: OperationDao;
  private mqttClient: mqtt.Client;
  private publisherId: string;

  constructor(mqttClient: mqtt.Client, publisherId: string) {
    this.dao = new OperationDao();
    this.mqttClient = mqttClient;
    this.publisherId = publisherId;
  }

  async createExpressOperation(
    username: string,
    trackerId: string,
    createExpressOperationRequest: any
  ) {
    // Response topic
    console.log("Response topic");
    const resTopic = `expressOperation/${username}/${trackerId}/response`;

    // Validate message
    console.log("Validate message");
    let reqValidated: CreateExpressOperationRequest;
    try {
      reqValidated = this.validateCreateExpressOperationRequest(
        createExpressOperationRequest
      );
    } catch (error) {
      this.mqttClient.publish(
        resTopic,
        JSON.stringify({
          status: "error",
          message: `Invalid request received (expected schema = ${JSON.stringify(
            {
              location: {
                latitude: 20,
                longitude: 10,
              },
              radiusInKm: 1,
              maxAltitudeInMeters: 80,
              durationInHours: 1,
              phone: "1234",
            }
          )}`,
          publisherId: this.publisherId,
        })
      );
      return;
    }

    // get tracker from the db
    const tracker = await new TrackersDao().one(trackerId, false);
    if (tracker === null) {
      return this.respondError(resTopic, `No tracker with the id ${trackerId}`);
    }

    // Get vehicle associated to the tracker
    console.log("Get vehicle associated to the tracker");
    const vehicle = tracker.vehicle;
    if (isNullOrUndefined(vehicle)) {
      return this.respondError(resTopic, `Tracker has no vehicle`);
    }

    // Verify vehicle belongs to the user
    console.log("Verify vehicle belongs to the user");
    if (vehicle.owner === undefined) {
      return this.respondError(resTopic, `Vehicle owner is undefined`);
    }
    const vehicleOwner = vehicle.owner.username;
    if (vehicleOwner === undefined || vehicleOwner !== username) {
      return this.respondError(resTopic, `You are not the vehicle owner`);
    }

    // Create operation polygon
    console.log("Create operation polygon");
    const location = reqValidated.location;
    const radiusInKm = reqValidated.radiusInKm;
    const polygon = generateFeatureFromExpress(location, radiusInKm);

    // Get user
    console.log("Get user");
    let user: User;
    try {
      user = await new UserDao().one(username);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return this.respondError(resTopic, `No user (username=${username})`);
      }
      return this.respondError(resTopic, (error as Error).message);
    }

    // Create operation
    console.log("Create operation");
    const operation: any = {
      name: "Express Operation (via MQTT)",
      owner: { username },
      flight_comments: "",
      contact: user.firstName + " " + user.lastName,
      contact_phone: reqValidated.phone,
      state: OperationState.PROPOSED,
      controller_location: undefined,
      operation_volumes: [],
      uas_registrations: [vehicle],
      creator: user,
      contingency_plans: [],
      priority_elements: {
        priority_level: Severity.NOTICE,
        priority_status: PriorityStatus.NONE,
      },
    };

    // Create operation volume
    console.log("Create operation volume");
    const beginDate = new Date();
    const endDate = new Date(beginDate);
    endDate.setHours(endDate.getHours() + reqValidated.durationInHours);
    const operVol: OperationVolume = {
      ordinal: 0,
      near_structure: false,
      effective_time_begin: beginDate.toISOString(),
      effective_time_end: endDate.toISOString(),
      min_altitude: 0,
      max_altitude: reqValidated.maxAltitudeInMeters,
      beyond_visual_line_of_sight: false,
      operation_geography: polygon as Polygon,
    };
    operation.operation_volumes.push(operVol);

    // Save operation
    console.log("Save operation");
    const opDao = new OperationDao();
    let operationAdded: Operation;
    try {
      if (TRY_TO_ACTIVATE_NEW_OPERATIONS) {
        operationAdded = await opDao.saveOverridingState(operation);
      } else {
        operationAdded = await opDao.save(operation);
      }
    } catch (error) {
      return this.respondError(resTopic, (error as Error).message);
    }

    // Respond
    console.log("Respond");
    this.mqttClient.publish(
      resTopic,
      `${JSON.stringify({
        status: "ok",
        operation: operationAdded,
        publisherId: this.publisherId,
      })}`
    );
  }

  async activatedOperationByLocation(
    username: string,
    position: getgufiPosition,
    trackerId: string,
    vehicle: VehicleReg
  ) {
    const responseTopic =
      "getGufi" + "/" + username + "/" + trackerId + "/" + "response";
    const { location, altitude_gps } = position;

    const alt = await getElevation([
      {
        lat: location?.coordinates[1],
        lng: location?.coordinates[0],
      },
    ]);
    //fix altitude to be AGL before asking for operation
    position.altitude = position.altitude_gps! - alt.results[0].elevation;
    let response: getgufiResponse;

    try {
      const operation = await this.dao.getActivatedOperationByPosition(
        location,
        altitude_gps
      );
      // verify that the vehicle is one of the vehicles authorized to fly in the operation
      if (operation.uas_registrations === undefined) {
        this.respondError(
          responseTopic,
          `The operation '${operation.gufi}' has no vehicles authorized to fly.`
        );
        return;
      }
      const vehicleIsAuth =
        operation.uas_registrations.find((v) => v.uvin === vehicle.uvin) !==
        undefined;
      if (!vehicleIsAuth) {
        this.respondError(
          responseTopic,
          `The vehicle '${vehicle.uvin}' associated to the tracker '${trackerId}' is not authorized to fly in the operation '${operation.gufi}'.`
        );
        return;
      }

      const gufi = operation.gufi;

      response = {
        status: "ok",
        gufi: gufi,
        altitude: alt.results[0].elevation,
        publisherId: this.publisherId,
      };

      this.mqttClient.publish(responseTopic, JSON.stringify(response));
    } catch (error) {
      let response: getgufiResponse;
      if (error instanceof InvalidDataError) {
        response = { status: "error", message: error.message };
      } else if (error instanceof NotFoundError) {
        response = {
          status: "error",
          message: `There is no operation ACTIVATED in the location received (location=${JSON.stringify(
            location
          )}, altitude_gps=${altitude_gps})`,
        };
      } else {
        response = {
          status: "error",
          message: GeneralUtils.getErrorMessage(error),
          publisherId: this.publisherId,
        };
      }
      this.mqttClient.publish(responseTopic, JSON.stringify(response));
    }
  }

  // ---------------------------------------------------------------
  // ---------------------- PRIVATE FUNCTIONS ----------------------
  // ---------------------------------------------------------------

  private validateCreateExpressOperationRequest(
    createExpressOperationRequest: any
  ): CreateExpressOperationRequest {
    const schema = Joi.object({
      location: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
      }).required(),
      radiusInKm: Joi.number().required(),
      maxAltitudeInMeters: Joi.number().required(),
      durationInHours: Joi.number().integer().min(1).required(),
      phone: Joi.string().required(),
    });
    const validationResult = schema.validate(createExpressOperationRequest);
    if (validationResult.error !== undefined) {
      throw new Error(validationResult.error.message);
    }
    return {
      location: {
        latitude: createExpressOperationRequest.location.latitude,
        longitude: createExpressOperationRequest.location.longitude,
      },
      radiusInKm: createExpressOperationRequest.radiusInKm,
      maxAltitudeInMeters: createExpressOperationRequest.maxAltitudeInMeters,
      durationInHours: createExpressOperationRequest.durationInHours,
      phone: createExpressOperationRequest.phone,
    };
  }

  private respondError(responseTopic: string, message: string) {
    const response = {
      status: "error",
      message,
      publisherId: this.publisherId,
    };
    this.mqttClient.publish(responseTopic, JSON.stringify(response));
  }
}

type CreateExpressOperationRequest = {
  location: {
    latitude: number;
    longitude: number;
  };
  radiusInKm: number;
  maxAltitudeInMeters: number;
  durationInHours: number;
  phone: string;
};
