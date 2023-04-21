/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as mqtt from "mqtt";
import { NotFoundError } from "../../daos/db-errors";
import { VehicleDao } from "../../daos/vehicle.dao";
import { VehicleReg } from "../../entities/vehicle-reg";
import { MQTT_ENDPOINT, MQTT_PASS, MQTT_USER } from "../../utils/config.utils";
import { MQTTOperationController } from "./controllers/operation.controller";
import { MQTTPositionController } from "./controllers/position.controller";
import { respondError } from "./utils";

const positionTopic = "position/#";
const getGufiTopic = "getGufi/#";
const expressOperationTopic = "expressOperation/#";

export class MQTT {
  private mqttClient: mqtt.Client;
  private positionController: MQTTPositionController;
  private operationController: MQTTOperationController;

  constructor() {
    this.mqttClient = mqtt.connect(MQTT_ENDPOINT!, {
      username: MQTT_USER,
      password: MQTT_PASS,
      rejectUnauthorized: false,
    });

    this.positionController = new MQTTPositionController();
    this.operationController = new MQTTOperationController(this.mqttClient);

    this.mqttClient.on("connect", () => {
      console.log("Connected to MQTT");
      this.mqttClient.subscribe([positionTopic], () => {
        console.log(`Subscribed to topic '${positionTopic}'`);
      });
      this.mqttClient.subscribe([getGufiTopic], () => {
        console.log(`Subscribed to topic '${getGufiTopic}'`);
      });
      this.mqttClient.subscribe([expressOperationTopic], () => {
        console.log(`Subscribed to topic '${expressOperationTopic}'`);
      });
    });
    this.mqttClient.on("message", async (topic, message) => {
      this.handleIncomingMessage(topic, message.toString());
    });
  }

  private async handleIncomingMessage(topic: string, message: string) {
    //separates topic
    const topicSplit = topic.split("/");
    //if topic is response is an echo of the backend response
    if (topicSplit[3] === "response") {
      return;
    }
    const topicName = topicSplit[0];
    const username = topicSplit[1];
    const trackerId = topicSplit[2];

    // get vehicle associated to the tracker
    let vehicle: VehicleReg;
    try {
      vehicle = await new VehicleDao().oneByTrackerId(trackerId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        respondError(
          this.mqttClient,
          topic,
          `There is no vehicle associated to the tracker ${trackerId}`
        );
        return;
      }
      respondError(
        this.mqttClient,
        topic,
        `There was an error trying to get the vehicle associated to the tracker (error=${
          (error as Error).message
        })`
      );
      return;
    }

    // verify user is operator of the vehicle
    if (vehicle.operators === undefined) {
      respondError(
        this.mqttClient,
        topic,
        "Vehicle associated has no operators"
      );
      return;
    }
    const userIsOperator =
      vehicle.operators.find((operator) => operator.username === username) !==
      undefined;
    if (!userIsOperator) {
      respondError(
        this.mqttClient,
        topic,
        `User '${username}' is not operator of the vehicle '${vehicle.uvin}' associated to the tracker '${trackerId}'`
      );
      return;
    }

    //parse the position
    const parsedMessage = JSON.parse(message);
    switch (topicName) {
      case "position":
        this.positionController.save(parsedMessage, username);
        break;
      case "getGufi":
        this.operationController.activatedOperationByLocation(
          username,
          parsedMessage,
          trackerId,
          vehicle
        );
        break;
      case "expressOperation":
        this.operationController.createExpressOperation(
          username,
          trackerId,
          parsedMessage
        );
        break;
      default:
        break;
    }
  }
}
