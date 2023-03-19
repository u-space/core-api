/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fileServerUrl } from "./config.utils";
import { getUrl } from "./services/upload-file.service";

export default class GeneralUtils {
  static getDownloadFileUrl(documentFileName: string): string {
    return fileServerUrl.slice(0, -1) + getUrl(documentFileName);
  }

  static getErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null && "message" in error)
      return `${error.message}`;
    return "";
  }
}
