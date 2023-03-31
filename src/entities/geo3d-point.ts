/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { GeoPoint } from "./geo-point";
import { point } from "@turf/turf";

export class Geo3DPoint {
  private longitude: number;
  private latitude: number;
  private altitude: number;

  constructor(longitude: number, latitude: number, altitude: number) {
    this.longitude = longitude;
    this.latitude = latitude;
    this.altitude = altitude;
  }

  public static fromGeoPoint(point: GeoPoint, altitude: number): Geo3DPoint {
    return new Geo3DPoint(point.getLongitude(), point.getLatitude(), altitude);
  }

  getLongitude(): number {
    return this.longitude;
  }
  getLatitude(): number {
    return this.latitude;
  }
  getAltitude(): number {
    return this.altitude;
  }

  public toPoint(): ReturnType<typeof point> {
    return point([this.longitude, this.latitude, this.altitude]);
  }
}
