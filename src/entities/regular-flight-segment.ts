/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Geo3DPoint } from "./geo3d-point";

export class RegularFlightSegment {
  private id: string;
  private start: Geo3DPoint;
  private end: Geo3DPoint;
  private horizontalBuffer: number;
  private verticalBuffer: number;
  private groundSpeed: number;
  private timeBuffer: number;
  private ordinal: number;

  constructor(
    id: string,
    start: Geo3DPoint,
    end: Geo3DPoint,
    horizontalBuffer: number,
    verticalBuffer: number,
    groundSpeed: number,
    timeBuffer: number,
    ordinal: number
  ) {
    this.id = id;
    this.start = start;
    this.end = end;
    this.horizontalBuffer = horizontalBuffer;
    this.verticalBuffer = verticalBuffer;
    this.groundSpeed = groundSpeed;
    this.timeBuffer = timeBuffer;
    this.ordinal = ordinal;
  }

  public setStartPoint(start: Geo3DPoint): void {
    this.start = start;
  }
  public setEndPoint(end: Geo3DPoint): void {
    this.end = end;
  }

  getId(): string {
    return this.id;
  }
  getStart(): Geo3DPoint {
    return this.start;
  }
  getEnd(): Geo3DPoint {
    return this.end;
  }
  getHorizontalBuffer(): number {
    return this.horizontalBuffer;
  }
  getVerticalBuffer(): number {
    return this.verticalBuffer;
  }
  getGroundSpeed(): number {
    return this.groundSpeed;
  }
  getTimeBuffer(): number {
    return this.timeBuffer;
  }
  getOrdinal(): number {
    return this.ordinal;
  }
}
