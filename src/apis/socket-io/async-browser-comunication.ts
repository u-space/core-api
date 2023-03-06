/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { app } from "../../main";
import { Position } from "../../entities/position";
import { OperationState } from "../../entities/operation";

//This type is set so only gufi is passed
type Gufi = {
  gufi: string;
};
type PublicUvr = {
  message_id: string;
};
type PublicObject = Gufi | PublicUvr;

function send(topic: any, object: any) {
  if (app.privateIo != undefined) {
    app.privateIo.emit(topic, object);
  } else {
    // console.log(`app.io is undefined`)
    return [topic, object];
  }
}

//TODO IMPORTANT MAKE TYPES TO CHECK IS A PUBLIC OBJECT
function sendPublic(topic: any, object: PublicObject) {
  if (app.publicIo != undefined) {
    app.publicIo.emit(topic, object);
  } else {
    // console.log(`app.io is undefined`)
    return [topic, object];
  }
}

function castAsANumber(number: any) {
  if (typeof number == "number") {
    return number;
  } else if (typeof number == "string") {
    return Number(number);
  } else {
    throw `Can't cast ${number} to a number`;
  }
}

export function sendTrackerPosition(position: Position, gufi: string) {
  return send(`new-tracker-position[gufi=${gufi}]`, {
    latitude: position.location.coordinates[1],
    longitude: position.location.coordinates[0],
    altitude: castAsANumber(position.altitude_gps),
    heading: castAsANumber(position.heading),
    time_sent: position.time_sent,
  });
}

export function sendPositionToMonitor(
  position: Position,
  controller_location: any
) {
  const positionToSend = {
    altitude_gps: castAsANumber(position.altitude_gps),
    location: { type: "Point", coordinates: position.location.coordinates },
    heading: castAsANumber(position.heading),
    time_sent: position.time_sent,
    gufi:
      typeof position.gufi === "string" ? position.gufi : position.gufi.gufi,
    added_from_dat_file: position.added_from_dat_file,
    id: position.id,
    controller_location: controller_location,
    uvin: position.uvin
      ? position.uvin.uvin
        ? position.uvin.uvin
        : position.uvin
      : null,
  };
  // console.log(JSON.stringify(position, null, 2))
  return send("new-position", positionToSend);
}

export function sendHazardPositionToMonitor(position: any) {
  // app.io.emit('new-position', position)
  return send("new-hazard-position", { ...position });
}

export function sendOperationFlyStatus(inOperation: any) {
  // app.io.emit('position-status', inOperation)
  return send("position-status", inOperation);
}

export function sendNewOperation(info: any) {
  sendPublic("new-operation", info);
  return send("new-operation", info);
}

export function sendUpdateOperation(info: any) {
  return send("update-operation", info);
}

export function sendUvr(uvrInfo: PublicUvr) {
  return sendPublic("new-uvr", uvrInfo);
}

export function sendAlgo(position: Position) {
  // app.io.emit('new-position', position)
  return send("new-position", position);
}

export function sendUserLogged() {
  // app.io.emit('user-logged')
  return send("user-logged", {});
}

export function sendOperationStateChange(
  gufi: string,
  state: OperationState,
  message: string
) {
  return send(`operation-state[gufi=${gufi}]`, { state, message });
}
