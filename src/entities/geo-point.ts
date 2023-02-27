/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { point } from "turf";

export class GeoPoint {
  private longitude: number;
  private latitude: number;

  constructor(longitude: number, latitude: number) {
    this.longitude = longitude;
    this.latitude = latitude;
  }

  getLongitude(): number {
    return this.longitude;
  }
  getLatitude(): number {
    return this.latitude;
  }

  public toPoint(): ReturnType<typeof point> {
    return point([this.longitude, this.latitude]);
  }
}
