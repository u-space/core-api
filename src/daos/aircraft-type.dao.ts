/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AAAAircratType } from "../types";

export default interface IAircraftTypeDao {
  all(): Promise<AAAAircratType[]>;
  one(id: number): Promise<AAAAircratType>;
  save(entity: any): Promise<AAAAircratType>;
}
