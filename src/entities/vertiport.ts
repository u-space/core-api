/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export class Vertiport {
  private id: string;
  private name: string;
  private point: any;
  private buffer: number;
  private closedHours: string[];
  private timeBetweenFlights: number;

  constructor(
    id: string,
    name: string,
    point: any,
    buffer: number,
    closedHours: string[],
    timeBetweenFlights: number
  ) {
    this.id = id;
    this.name = name;
    this.point = point;
    this.buffer = buffer;
    this.closedHours = closedHours;
    this.timeBetweenFlights = timeBetweenFlights;
  }

  getId(): string {
    return this.id;
  }
  getName(): string {
    return this.name;
  }
  getPoint(): any {
    return this.point;
  }
  getBuffer(): number {
    return this.buffer;
  }
  getClosedHours(): string[] {
    return this.closedHours;
  }
  getTimeBetweenFlights(): number {
    return this.timeBetweenFlights;
  }
}
