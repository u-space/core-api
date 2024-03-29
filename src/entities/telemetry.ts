/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export interface Telemetry {
  id?: number;
  timestamp: number;
  lat: number;
  lon: number;
  publicTelemetry: boolean;
  gufi?: string;
  uvin?: string;
  comments?: string;
  heading?: number;
  altitudeAbs?: number;
  altitudeRel?: number;
  inAir?: boolean;
  calculatedData?: {
    groundElevationInMeters?: number;
    elevationProviderAPI?: string;
    altitudeAGLInMeters?: number;
  };
}
