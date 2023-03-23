/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function areObjectsEqual(obj1: any, obj2: any): boolean {
  // base cases
  if (typeof obj1 !== typeof obj2) return false;
  if (typeof obj1 === "undefined") return true;
  if (typeof obj1 === "string") return obj1 === obj2;
  if (typeof obj1 === "number") return obj1 === obj2;
  if (typeof obj1 === "boolean") return obj1 === obj2;
  if (typeof obj1 === "bigint") return obj1 === obj2;
  if (typeof obj1 === "function") return obj1 === obj2;
  if (typeof obj1 === "symbol") return obj1 === obj2;

  // Get the keys of the first object
  const keys = Object.keys(obj1);

  // Check if the number of keys in the first object is the same as the number of keys in the second object
  if (keys.length !== Object.keys(obj2).length) {
    return false;
  }

  // Check if each key in the first object exists in the second object and has the same value
  for (const key of keys) {
    if (!(key in obj2) || !areObjectsEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  // All keys in the first object exist in the second object with the same values
  return true;
}
