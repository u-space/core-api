/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Geo3DPoint } from "./geo3d-point";
import { RegularFlightSegment } from "./regular-flight-segment";
import { Vertiport } from "./vertiport";

export class RegularFlight {
  private id: string;
  private startingPort: Vertiport;
  private endingPort: Vertiport;
  private path: RegularFlightSegment[];
  private name: string;
  private verticalSpeed: number;

  constructor(
    id: string,
    startingPort: Vertiport,
    endingPort: Vertiport,
    path: RegularFlightSegment[],
    name: string,
    verticalSpeed: number
  ) {
    this.id = id;
    this.startingPort = startingPort;
    this.endingPort = endingPort;
    this.path = path;
    this.name = name;
    this.verticalSpeed = verticalSpeed;
  }

  public setId = (id: string) => (this.id = id);

  public correctStartEndPoints() {
    this.path[0].setStartPoint(
      Geo3DPoint.fromGeoPoint(
        this.startingPort.getPoint(),
        this.path[0].getStart().getAltitude()
      )
    );
    this.path[this.path.length - 1].setEndPoint(
      Geo3DPoint.fromGeoPoint(
        this.endingPort.getPoint(),
        this.path[this.path.length - 1].getEnd().getAltitude()
      )
    );
  }

  getId(): string {
    return this.id;
  }
  getStartingPort(): Vertiport {
    return this.startingPort;
  }
  getEndingPort(): Vertiport {
    return this.endingPort;
  }
  getPath(): RegularFlightSegment[] {
    return this.path;
  }
  getName(): string {
    return this.name;
  }
  getVerticalSpeed(): number {
    return this.verticalSpeed;
  }
}
