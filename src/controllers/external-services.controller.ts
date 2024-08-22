/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Client } from "@googlemaps/google-maps-services-js";
import { GOOGLE_API } from "../utils/config.utils";

const client = new Client({});

/*Using google elevation API

locs must be something like [{"lat": 39.7391536,"lng": -104.9847034}, {"lat": 89.7391536,"lng": -104.9847034} ]

It will answer:
{
  "results":
    [
      {
        "elevation": 1608.637939453125,
        "location": { "lat": 39.7391536, "lng": -104.9847034 },
        "resolution": 4.771975994110107,
      },
     {
        "elevation": 108.5665454646,
        "location": { "lat": 89.7391536, "lng": -104.9847034 },
        "resolution": 5.7778888899998877,
      },
    ],
  "status": "OK",
}

*/
export const getElevation = async (locs: any) => {
  const r = await client.elevation({
    params: {
      locations: locs,
      key: GOOGLE_API!,
    },
    timeout: 10000, // milliseconds
  });
  return r.data;
};

export const getElevation2 = async (
  lat: number,
  lng: number
): Promise<{ elevation: number; provider: string }> => {
  const r = await client.elevation({
    params: {
      locations: [{ lat, lng }],
      key: GOOGLE_API!,
    },
    timeout: 10000, // milliseconds
  });
  return {
    elevation: r.data.results[0].elevation,
    provider: "GOOGLE",
  };
};
