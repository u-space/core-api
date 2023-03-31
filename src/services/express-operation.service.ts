/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Feature, GeoJsonProperties, Point } from "geojson";
import { circle, point } from "@turf/turf";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateFeatureFromExpress(center: any, radius: number) {
  if (!(center.longitude && center.latitude)) {
    throw new Error("{longitude:int, latitude:int} must be defined");
  }
  const lngLat: Feature<Point, GeoJsonProperties> = point([
    center.longitude,
    center.latitude,
  ]);
  circle(lngLat, 1);
  const polygon: Feature = circle(lngLat, radius, 10, "kilometers");
  return polygon.geometry;
}
