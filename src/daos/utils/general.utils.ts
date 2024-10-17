/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import GeneralUtilsFromUtils from "../../utils/general.utils";
import { isNullOrUndefined, isArray, isString } from "util";

export default class GeneralUtils {
  static setDocumentsDownloadFileUrl(obj: any) {
    const documents = obj.extra_fields["documents"];
    if (documents && Array.isArray(documents)) {
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        console.log('docuemnt:', document);
        if (document) {
          // document.extra_fields = document.extra_fields_json
          if (document.name) {
            documents[i]["downloadFileUrl"] =
              GeneralUtilsFromUtils.getDownloadFileUrl(document.name);
          }

        }
      }
    }
  }

  static removeDocumentsAndKeepIds(extraFields: any) {
    if (isNullOrUndefined(extraFields)) return;
    const documents = extraFields.documents;
    if (!isArray(documents)) return;
    const documentIds: string[] = [];
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      if (isNullOrUndefined(document)) continue;
      if (!isString(document.id)) continue;
      documentIds.push(document.id);
    }
    extraFields.documents = documentIds;
  }
}
