/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fs, { accessSync, constants, unlinkSync } from "fs";
import { uploadFolder } from "./config.utils";

export const extisFile = (fileName: any) => {
  const path = `${uploadFolder}/${fileName}`;
  try {
    accessSync(path, constants.R_OK | constants.W_OK);
    return true;
  } catch (err) {
    return false;
  }
};

export const listDocumentFiles = () => {
  const path = uploadFolder;
  return fs.readdirSync(path);
};

export const removeFiles = (listFileNames: any) => {
  const removedFiles: any = [];
  listFileNames.forEach((fileName: any) => {
    const path = `${uploadFolder}/${fileName}`;
    try {
      unlinkSync(path);
      console.log(`successfully deleted ${path}`);
      removedFiles.push(fileName);
    } catch (err) {
      console.log(`error deleting ${path}`);
    }
  });
  return removedFiles;
};
