/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as ServiceTypes from "../_types";
import * as DaoErrors from "../../daos/db-errors";

export function handleDaoError(error: any): any {
  if (error instanceof DaoErrors.CorruptedDataBaseError) {
    const err = error as DaoErrors.CorruptedDataBaseError;
    return new ServiceTypes.DataBaseError(err.message, err.error);
  } else if (error instanceof DaoErrors.DataBaseError) {
    const err = error as DaoErrors.DataBaseError;
    return new ServiceTypes.DataBaseError(err.message, err.error);
  } else if (error instanceof DaoErrors.DuplicateEntryError) {
    const err = error as DaoErrors.DuplicateEntryError;
    return new ServiceTypes.InvalidDataError(err.message, err.error);
  } else if (error instanceof DaoErrors.InvalidDataError) {
    const err = error as DaoErrors.InvalidDataError;
    return new ServiceTypes.InvalidDataError(err.message, err.error);
  } else if (error instanceof DaoErrors.NotFoundError) {
    const err = error as DaoErrors.NotFoundError;
    return new ServiceTypes.NotFoundError(err.message, err.error);
  }
  return error;
}
