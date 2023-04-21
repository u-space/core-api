import { MqttClient } from "mqtt";

export function respondError(
  mqttClient: MqttClient,
  topic: string,
  message: string
) {
  mqttClient.publish(
    `${topic}/response`,
    JSON.stringify({
      status: "error",
      message,
    })
  );
}
