/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { drop, take, reverse, sortBy, filter } from "lodash";

export const filterOrderPageAndSkipCollection = (
  collection: any,
  filterProp: any,
  filterValue: any,
  orderProp: any,
  orderValue: any,
  pageSkip = 0,
  pageTake = 10
) => {
  let matched = collection;
  if (filterProp && filterValue)
    matched = filter(collection, (item) => {
      return (
        item[filterProp] !== null &&
        item[filterProp] !== undefined &&
        item[filterProp].indexOf(filterValue) > -1
      );
    });
  let ordered = sortBy(matched, [orderProp]);
  if (orderValue === "DESC") {
    ordered = reverse(ordered);
  }
  return {
    result: take(drop(ordered, pageSkip), pageTake),
    count: ordered.length,
  };
};
