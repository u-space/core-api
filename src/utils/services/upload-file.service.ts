/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// import * as multer from 'multer'
import multer from "multer";
import { uploadFolder } from "../config.utils";

const uploadPath = uploadFolder;

const MAX_FILE_SIZE_MB = 15;

// export const getUrl = (filename:string) => `${backendUrl}uploads/${filename}`
//save relative url path
export const getUrl = (filename: string) => `/uploads/${filename}`;

// File: {"fieldname":"file","originalname":"prueba.txt","encoding":"7bit","mimetype":"text/plain"}

const mimeTypes = [
  "image/jpeg",
  "image/bmp",
  "image/gif",
  "image/png",
  "image/tiff",
  "application/pdf",
];

const storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, uploadPath);
  },

  filename: function (req: any, file: any, cb: any) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // console.log(`Prueba: ${JSON.stringify(file)}`)
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

function fileFilter(req: any, file: any, cb: any) {
  // The function should call `cb` with a booleanB
  // to indicate if the file should be accepted
  if (mimeTypes.indexOf(file.mimetype) == -1) {
    cb(new Error("Invalid type of file"));
  } else {
    cb(null, true);
  }

  //     // To reject this file pass `false`, like so:
  //     cb(null, false)

  // // To accept the file pass `true`, like so:
  // cb(null, true)

  // // You can always pass an error if something goes wrong:
  // cb(new Error('I don\'t have a clue!'))
}

const upload = multer({
  storage: storage,
});

const uploadFilteringImages = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

/**
 *
 * @param filename [  { name: 'avatar', maxCount: 1 },  { name: 'gallery', maxCount: 8 }]
 */
export const multipleFiles = (fields: any, filterImages: any) => {
  if (!fields) {
    return upload.any();
  }
  const multerFields = fields.map((field: any) => {
    return {
      name: field.name,
      maxCount: field.maxCount,
    };
  });

  if (filterImages) {
    return uploadFilteringImages.fields(multerFields);
  } else {
    return upload.fields(multerFields);
  }
};

export const anyFiles = (filterImages: any) => {
  if (filterImages) {
    return uploadFilteringImages.any();
  } else {
    return upload.any();
  }
};
