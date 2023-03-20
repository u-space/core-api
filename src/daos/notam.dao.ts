/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Polygon } from "geojson";
import { AAANotams } from "../types";

export default interface INotamDao {
  all(): Promise<AAANotams[]>;
  one(message_id: string): Promise<AAANotams>;
  save(notam: AAANotams): Promise<AAANotams>;
  remove(id: string): Promise<void>;
  getNotamByDateAndArea(date: string, polygon: Polygon): Promise<any>;
}
