/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Polygon } from "geojson";
import { RestrictedFlightVolume } from "../../entities/restricted-flight-volume";
import {
  ObjectKeyType,
  validateObjectKeys,
} from "../../utils/validation.utils";
import { isArray, isNumber, isObject } from "util";

export default class ParseUtils {
  static parseAnyToPolygon(obj: any): any {
    validateObjectKeys(
      obj,
      [
        { name: "type", type: ObjectKeyType.STRING },
        { name: "coordinates", type: ObjectKeyType.OBJECT },
      ],
      []
    );
    if (obj.type !== "Polygon")
      throw new Error("geography type must be 'Polygon'");
    const coordinates: any = obj.coordinates;
    if (!isArray(coordinates)) throw new Error("coordinates must be an array");
    if (coordinates.length === 0)
      throw new Error("coordinates can not be empty");
    for (let i = 0; i < coordinates.length; i++) {
      const subCoordinates = coordinates[i];
      if (!isArray(subCoordinates))
        throw new Error("coordinates children must be arrays");
      if (subCoordinates.length < 4)
        throw new Error("coordinates children must have 4 items at least");
      for (let j = 0; j < subCoordinates.length; j++) {
        const coordinate = subCoordinates[j];
        if (!isArray(coordinate))
          throw new Error("each coordinate must be an array");
        if (coordinate.length !== 2)
          throw new Error("each coordinate must have 2 items (long, lat)");
        const long = coordinate[0];
        const lat = coordinate[1];
        if (
          !isNumber(long) ||
          !isNumber(lat) ||
          long < -180 ||
          long > 180 ||
          lat < -90 ||
          lat > 90
        ) {
          throw new Error(`invalid coordinate [long=${long}, lat=${lat}]`);
        }
      }
    }
    return {
      type: "Polygon",
      coordinates,
    };
  }

  static parseAnyToRestrictedFlightVolume(obj: any): RestrictedFlightVolume {
    if (!isObject(obj)) throw new Error("Received parameter must be an object");
    validateObjectKeys(
      obj,
      [
        { name: "geography", type: ObjectKeyType.OBJECT },
        { name: "min_altitude", type: ObjectKeyType.NUMBER },
        { name: "max_altitude", type: ObjectKeyType.NUMBER },
        { name: "comments", type: ObjectKeyType.STRING },
      ],
      [
        { name: "id", type: ObjectKeyType.STRING },
        { name: "deletedAt", type: ObjectKeyType.STRING },
      ]
    );
    const result = new RestrictedFlightVolume();
    result.geography = this.parseAnyToPolygon(obj.geography);
    result.min_altitude = obj.min_altitude;
    result.max_altitude = obj.max_altitude;
    result.comments = obj.comments;
    result.id = obj.id;
    result.deletedAt = obj.deletedAt;
    return result;
  }
}
