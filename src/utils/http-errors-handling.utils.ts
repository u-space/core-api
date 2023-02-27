/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const CONST_BAD_REQUEST = "BAD_REQUEST";
const CONST_UNAUTHORIZED = "UNAUTHORIZED";
const CONST_FORBIDDEN = "FORBIDDEN";
const CONST_NOT_FOUND = "NOT_FOUND";
const CONST_INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";

export function createHttpError(status, message) {
  const err = new Error(message);
  err.name = HttpErrorTypes[status].name;
  Error.captureStackTrace(err, createHttpError);
  return err;
}

// function getHttpStatusByErrorName(name) {
//     const httpErrorTypes = Object.values(HttpErrorTypes);
//     for (let i = 0; i < httpErrorTypes.length; i++) {
//         if (httpErrorTypes[i].name === name) {
//             return httpErrorTypes[i].status;
//         }
//     }
//     return 500;
// }

const HttpErrorTypes = {
  400: { status: 400, name: CONST_BAD_REQUEST },
  401: { status: 401, name: CONST_UNAUTHORIZED },
  403: { status: 403, name: CONST_FORBIDDEN },
  404: { status: 404, name: CONST_NOT_FOUND },
  500: { status: 500, name: CONST_INTERNAL_SERVER_ERROR },
};
