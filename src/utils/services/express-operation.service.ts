/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateFeatureFromExpress(_center: unknown, _radius: number) {
  throw new Error("Not implemented");
  /*if (!(center.longitude && center.latitude)) {
		throw new Error('{lng:int, lat:int} must be defined');
	}
	try {
		const lngLat = point([center.longitude, center.latitude]);
		const polygon: Feature = circle(lngLat, radius, 10, 'kilometers');
		return polygon.geometry;
	} catch (error) {
		throw new Error(error);
	}*/
}
