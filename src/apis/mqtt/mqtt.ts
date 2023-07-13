/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as mqtt from "mqtt";
import { MQTT_ENDPOINT, MQTT_PASS, MQTT_USER } from "../../utils/config.utils";
import { MQTTOperationController } from "./controllers/operation.controller";
import { MQTTPositionController } from "./controllers/position.controller";
import { respondError } from "./utils";
import { TrackersDao } from "../../daos/trackers/tracker.dao";
import { isNullOrUndefined } from "util";
import logger from "./logger";
import { v4 as uuidv4 } from "uuid";

const positionTopic = "position/#";
const getGufiTopic = "getGufi/#";
const expressOperationTopic = "expressOperation/#";

export class MQTT {
  private static PUBLISHER_ID = uuidv4();

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
    this.operationController = new MQTTOperationController(
      this.mqttClient,
      MQTT.PUBLISHER_ID
    );

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
      logger.tryToLog(JSON.stringify({ topic, message: message.toString() }));
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

    // get tracker from db
    const tracker = await new TrackersDao().one(trackerId, false);
    if (tracker === null) {
      respondError(
        this.mqttClient,
        topic,
        `No tracker with the id ${trackerId}`,
        MQTT.PUBLISHER_ID
      );
      return;
    }

    // get vehicle associated to the tracker
    const vehicle = tracker.vehicle;
    if (isNullOrUndefined(vehicle)) {
      respondError(
        this.mqttClient,
        topic,
        `There is no vehicle associated to the tracker ${trackerId}`,
        MQTT.PUBLISHER_ID
      );
      return;
    }

    // verify user is operator of the vehicle
    if (vehicle.operators === undefined) {
      respondError(
        this.mqttClient,
        topic,
        "Vehicle associated has no operators",
        MQTT.PUBLISHER_ID
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
        `User '${username}' is not operator of the vehicle '${vehicle.uvin}' associated to the tracker '${trackerId}'`,
        MQTT.PUBLISHER_ID
      );
      return;
    }

    //parse the position
    let parsedMessage: any;
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      return;
    }
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
