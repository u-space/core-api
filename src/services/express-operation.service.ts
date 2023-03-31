/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Feature } from "geojson";
import { circle, point } from "turf";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateFeatureFromExpress(center: any, radius: number) {
  if (!(center.longitude && center.latitude)) {
    throw new Error("{lng:int, lat:int} must be defined");
  }
  const lngLat = point([center.longitude, center.latitude]);
  const polygon: Feature = circle(lngLat, radius, 10, "kilometers");
  return polygon.geometry;
}
