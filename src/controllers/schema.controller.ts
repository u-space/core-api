/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import {
  USER_DOCUMENT_EXTRA_FIELDS_SCHEMA,
  USER_EXTRA_FIELDS_SCHEMA,
  VEHICLE_EXTRA_FIELDS_SCHEMA,
} from "../utils/config.utils";

import { logAndRespond200 } from "./utils";
export class SchemasController {
  async getSchemas(request: Request, response: Response) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const userExtraFieldsSchema = require(USER_EXTRA_FIELDS_SCHEMA!);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vehicleExtraFieldsSchema = require(VEHICLE_EXTRA_FIELDS_SCHEMA!);

    // TODO: We are returning user document extra fields, but why dont return vehicle document extra fields?
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const docSchemas = require(USER_DOCUMENT_EXTRA_FIELDS_SCHEMA!);

    const responseJson = {
      userExtraFields: userExtraFieldsSchema,
      vehicleExtraFields: vehicleExtraFieldsSchema,
      documentExtraFields: docSchemas,
    };
    return logAndRespond200(response, responseJson, []);
  }
}
