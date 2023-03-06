/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as mqtt from "mqtt";
import { MQTT_ENDPOINT, MQTT_PASS, MQTT_USER } from "../../utils/config.utils";
import { MQTTOperationController } from "./controllers/operation.controller";
import { MQTTPositionController } from "./controllers/position.controller";

const positionTopic = "position/#";
const getGufiTopic = "getGufi/#";

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
          trackerId
        );
        break;
      default:
        break;
    }
  }
}
