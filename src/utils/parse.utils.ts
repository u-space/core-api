/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { GeoPoint } from "../entities/geo-point";
import { RegularFlightSegment } from "../entities/regular-flight-segment";
import { RegularFlight } from "../entities/regular-flight";
import { Vertiport } from "../entities/vertiport";
import {
  ObjectKeyType,
  validateArray,
  validateNumber,
  validateObjectKeys,
  validateString,
  validateStringArray,
} from "./validation.utils";
import { Geo3DPoint } from "../entities/geo3d-point";
import { User } from "../entities/user";
import { Document } from "../entities/document";
import { isObject, isString } from "util";

export enum ParsingIdCriteria {
  WITH_ID,
  WITHOUT_ID,
  ONLY_ID,
}

export function parseRegularFlight(
  obj: any,
  objMustHaveId: boolean
): RegularFlight {
  // validate the keys of the object received
  const keys = [
    { name: "startingPort", type: ObjectKeyType.OBJECT },
    { name: "endingPort", type: ObjectKeyType.OBJECT },
    { name: "path", type: ObjectKeyType.OTHER },
    { name: "name", type: ObjectKeyType.STRING },
    { name: "verticalSpeed", type: ObjectKeyType.NUMBER },
  ];
  if (objMustHaveId) keys.push({ name: "id", type: ObjectKeyType.STRING });
  validateObjectKeys(obj, keys, []);

  // parse all the attributes of the obj
  let id: any = null;
  if (objMustHaveId) {
    if (!validateString((obj as { id: any }).id))
      throw new Error(`'id' must be a string [id=${(obj as { id: any }).id}]`);
    id = (obj as { id: string }).id;
  }
  const startingPort: Vertiport = parseVertiport(
    (obj as { startingPort: any }).startingPort,
    ParsingIdCriteria.ONLY_ID
  );
  const endingPort: Vertiport = parseVertiport(
    (obj as { endingPort: any }).endingPort,
    ParsingIdCriteria.ONLY_ID
  );
  if (!validateArray((obj as { path: any }).path))
    throw new Error("'path' must be an array");
  const path: RegularFlightSegment[] = (obj as { path: Array<any> }).path.map(
    (item, index) => parseRegularFlightSegment(item, index, false)
  );
  if (!validateString((obj as { name: any }).name))
    throw new Error(
      `'name' must be a string [id=${(obj as { name: any }).name}]`
    );
  const name: string = (obj as { name: string }).name;

  if (!validateNumber((obj as { verticalSpeed: any }).verticalSpeed, 0, 1000))
    throw new Error(
      `'verticalSpeed' must be a number between 0 and 1000 [verticalSpeed=${
        (obj as { verticalSpeed: any }).verticalSpeed
      }]`
    );
  const verticalSpeed: number = (obj as { verticalSpeed: number })
    .verticalSpeed;

  // return the parsed obj
  return new RegularFlight(
    id,
    startingPort,
    endingPort,
    path,
    name,
    verticalSpeed
  );
}

export function parseVertiport(
  obj: any,
  parsingIdCriteria: ParsingIdCriteria
): Vertiport {
  // validate the keys of the object received
  let keys = [
    { name: "name", type: ObjectKeyType.STRING },
    { name: "point", type: ObjectKeyType.OBJECT },
    { name: "buffer", type: ObjectKeyType.NUMBER },
    { name: "closedHours", type: ObjectKeyType.OTHER },
    { name: "timeBetweenFlights", type: ObjectKeyType.NUMBER },
  ];

  if (parsingIdCriteria === ParsingIdCriteria.WITH_ID) {
    keys.push({ name: "id", type: ObjectKeyType.STRING });
  } else if (parsingIdCriteria === ParsingIdCriteria.ONLY_ID) {
    keys = [{ name: "id", type: ObjectKeyType.STRING }];
  } else if (parsingIdCriteria !== ParsingIdCriteria.WITHOUT_ID) {
    throw new Error(
      `Invalid parsing id criteria [parsingIdCriteria=${parsingIdCriteria}]`
    );
  }
  validateObjectKeys(obj, keys, []);

  // parse all the attributes of the obj
  let id: any = null;
  if (
    parsingIdCriteria === ParsingIdCriteria.WITH_ID ||
    parsingIdCriteria === ParsingIdCriteria.ONLY_ID
  ) {
    if (!validateString((obj as { id: any }).id))
      throw new Error(`'id' must be a string [id=${(obj as { id: any }).id}]`);
    id = (obj as { id: string }).id;
  }

  if (parsingIdCriteria === ParsingIdCriteria.ONLY_ID) {
    return new Vertiport(id, "", null, -1, [], -1);
  }

  if (!validateString((obj as { name: any }).name))
    throw new Error(
      `'name' must be a string [id=${(obj as { name: any }).name}]`
    );
  const name: string = (obj as { name: string }).name;
  const point: GeoPoint = parseGeoPoint((obj as { point: any }).point);
  if (!validateNumber((obj as { buffer: any }).buffer, 0, 100000))
    throw new Error(
      `'buffer' must be a number between 0 and 100.000 [buffer=${
        (obj as { buffer: any }).buffer
      }]`
    );
  const buffer: number = (obj as { buffer: number }).buffer;
  if (!validateStringArray((obj as { closedHours: any }).closedHours))
    throw new Error("'closedHours' must be a string array");
  const closedHours: string[] = (obj as { closedHours: Array<string> })
    .closedHours;
  if (
    !validateNumber(
      (obj as { timeBetweenFlights: any }).timeBetweenFlights,
      0,
      100000
    )
  )
    throw new Error(
      `'timeBetweenFlights' must be a number between 0 and 100.000 [timeBetweenFlights=${
        (obj as { timeBetweenFlights: any }).timeBetweenFlights
      }]`
    );
  const timeBetweenFlights: number = (obj as { timeBetweenFlights: number })
    .timeBetweenFlights;

  // return the parsed obj
  return new Vertiport(
    id,
    name,
    point,
    buffer,
    closedHours,
    timeBetweenFlights
  );
}

export function parseAnyToUser(obj: any): User {
  validateObjectKeys(
    obj,
    [
      { name: "username", type: ObjectKeyType.STRING },
      { name: "firstName", type: ObjectKeyType.STRING },
      { name: "lastName", type: ObjectKeyType.STRING },
      { name: "email", type: ObjectKeyType.STRING },
      { name: "role", type: ObjectKeyType.STRING },
    ],
    [
      { name: "VolumesOfInterest", type: ObjectKeyType.BOOLEAN },
      { name: "settings", type: ObjectKeyType.OBJECT },
      { name: "extra_fields", type: ObjectKeyType.OBJECT },
      { name: "deletedAt", type: ObjectKeyType.STRING },
      { name: "verification_token", type: ObjectKeyType.STRING },
      { name: "verified", type: ObjectKeyType.BOOLEAN },
      { name: "strExtraFields", type: ObjectKeyType.STRING },
    ]
  );
  return new User(
    obj["username"],
    obj["firstName"],
    obj["lastName"],
    obj["email"],
    obj["role"],
    obj["strExtraFields"],
    obj["VolumesOfInterest"],
    obj["settings"],
    obj["extra_fields"],
    obj["deletedAt"],
    obj["verification_token"],
    obj["verified"]
  );
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ------------------------------ PRIVATE FUNCTIONS ------------------------------
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

function parseGeoPoint(obj: any): GeoPoint {
  // validate the keys of the object received
  //const keys: string[] = ['longitude', 'latitude'];

  // parse all the attributes of the obj
  if (!validateNumber(obj["longitude"], -180, 180))
    throw new Error(
      `'longitude' must be a number between -180 and 180 [longitude=${obj["longitude"]}]`
    );
  const longitude: number = obj["longitude"];
  if (!validateNumber(obj["latitude"], -90, 90))
    throw new Error(
      `'latitude' must be a number between -90 and 90 [latitude=${obj["latitude"]}]`
    );
  const latitude: number = obj["latitude"];

  // return the parsed obj
  return new GeoPoint(longitude, latitude);
}

function parseGeo3DPoint(obj: any): Geo3DPoint {
  // validate the keys of the object received
  //const keys: string[] = ['longitude', 'latitude', 'altitude'];

  // parse all the attributes of the obj
  if (!validateNumber(obj["longitude"], -180, 180))
    throw new Error(
      `'longitude' must be a number between -180 and 180 [longitude=${obj["longitude"]}]`
    );
  const longitude: number = obj["longitude"];
  if (!validateNumber(obj["latitude"], -90, 90))
    throw new Error(
      `'latitude' must be a number between -90 and 90 [latitude=${obj["latitude"]}]`
    );
  const latitude: number = obj["latitude"];
  if (!validateNumber(obj["altitude"], -100000, 100000))
    throw new Error(
      `'altitude' must be a number between -100000 and 100000 [altitude=${obj["altitude"]}]`
    );
  const altitude: number = obj["altitude"];

  // return the parsed obj
  return new Geo3DPoint(longitude, latitude, altitude);
}

function parseRegularFlightSegment(
  obj: any,
  ordinal: number,
  objMustHaveId: boolean
): RegularFlightSegment {
  // validate the keys of the object received
  const keys = [
    { name: "start", type: ObjectKeyType.STRING },
    { name: "end", type: ObjectKeyType.STRING },
    { name: "horizontalBuffer", type: ObjectKeyType.NUMBER },
    { name: "verticalBuffer", type: ObjectKeyType.NUMBER },
    { name: "groundSpeed", type: ObjectKeyType.NUMBER },
    { name: "timeBuffer", type: ObjectKeyType.NUMBER },
  ];
  if (objMustHaveId) keys.push({ name: "id", type: ObjectKeyType.STRING });
  validateObjectKeys(obj, keys, []);

  // parse all the attributes of the obj
  let id: any = null;
  if (objMustHaveId) {
    if (!validateString(obj["id"]))
      throw new Error(`'id' must be a string [id=${obj["id"]}]`);
    id = obj["id"] as string;
  }

  const start: Geo3DPoint = parseGeo3DPoint(obj["start"]);
  const end: Geo3DPoint = parseGeo3DPoint(obj["end"]);
  if (!validateNumber(obj["horizontalBuffer"], 0, 100000))
    throw new Error(
      `'horizontalBuffer' must be a number between 0 and 100.000 [horizontalBuffer=${obj["horizontalBuffer"]}]`
    );
  const horizontalBuffer: number = obj["horizontalBuffer"];
  if (!validateNumber(obj["verticalBuffer"], 0, 100000))
    throw new Error(
      `'verticalBuffer' must be a number between 0 and 100.000 [verticalBuffer=${obj["verticalBuffer"]}]`
    );
  const verticalBuffer: number = obj["verticalBuffer"];
  if (!validateNumber(obj["groundSpeed"], 0, 100000))
    throw new Error(
      `'groundSpeed' must be a number between 0 and 100.000 [groundSpeed=${obj["groundSpeed"]}]`
    );
  const groundSpeed: number = obj["groundSpeed"];
  if (!validateNumber(obj["timeBuffer"], 0, 100000))
    throw new Error(
      `'timeBuffer' must be a number between 0 and 100.000 [timeBuffer=${obj["timeBuffer"]}]`
    );
  const timeBuffer: number = obj["timeBuffer"];

  // return the parsed obj
  return new RegularFlightSegment(
    id,
    start,
    end,
    horizontalBuffer,
    verticalBuffer,
    groundSpeed,
    timeBuffer,
    ordinal
  );
}

export function convertAnyToDocument(obj: any): Document {
  if (!isObject(obj)) throw new Error("Invalid parameter type");
  const mandatoryKeys = [
    { name: "name", type: ObjectKeyType.STRING },
    { name: "valid", type: ObjectKeyType.BOOLEAN },
  ];
  const optionalKeys = [
    { name: "tag", type: ObjectKeyType.STRING },
    { name: "valid_until", type: ObjectKeyType.STRING },
    { name: "observations", type: ObjectKeyType.STRING },
    { name: "extra_fields_str", type: ObjectKeyType.STRING },
  ];
  validateObjectKeys(obj, mandatoryKeys, optionalKeys);
  let extraFields = undefined;
  if (isString(obj.extra_fields_str)) {
    try {
      extraFields = JSON.parse(obj.extra_fields_str);
    } catch (error) {
      throw new Error(
        `extra_fields_str must be a json (extra_fields_str=${obj.extra_fields_str})`
      );
    }
  }
  const result = new Document(
    obj["name"],
    obj["tag"],
    obj["valid_until"],
    obj["observations"],
    obj["valid"],
    extraFields
  );
  return result;
}
