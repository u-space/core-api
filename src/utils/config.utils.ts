/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const jwtSecret: string = process.env.JWTSECRET!; //"@876fyivd&(&*%EH";
export const jwtExpTime: string = process.env.JWT_EXPIRATION_TIME!; //"1h";

if (
  process.env.NODE_ENV == "production" &&
  (process.env.JWTSECRET == "" || process.env.JWTSECRET == "changeMe")
) {
  throw "You must set a valid JWTSECRET on .env file";
}

export const cert = process.env.SSL_CERT || "./certificate/cert.pem";
export const key = process.env.SSL_KEY || "./certificate/key.pem";
export const keyPhrase = "qwer1234qwer1234";

export const generateOnlyAdmin = true;

export const SMTP_URL = process.env.SMTP_URL;
export const SMTP_USERNAME = process.env.SMTP_USERNAME;
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
export const SMTP_PORT: number = process.env.SMTP_PORT
  ? Number(process.env.SMTP_PORT)
  : -1;
export const SMTP_SECURE: boolean = process.env.SMTP_SECURE === "true";
export const SMTP_SELF_SIGNED = process.env.SMTP_SELF_SIGNED
  ? JSON.parse(process.env.SMTP_SELF_SIGNED)
  : true;

export const frontEndUrl = process.env.FRONT_END_URL || "http://localhost/";
export const backendUrl = process.env.BACKEND_URL || "http://localhost:4000/";
export const fileServerUrl = backendUrl; // process.env.BACKEND_URL || 'http://localhost:4000/';

export const adminEmail = process.env.ADMIN_EMAIL
  ? process.env.ADMIN_EMAIL.split(",")
  : ["ealonzo@dronfies.com"];

export const uploadFolder = process.env.UPLOAD_FOLDER || "./src/uploads";

export const MICROUTM_AUTH_URL =
  process.env.MICROUTM_AUTH_URL || "https://localhost:1737/";

export const THEME = process.env.THEME;
export const INSTANCE = process.env.INSTANCE;
export const USER_CONTROLLER_EXTENSION = process.env.USER_CONTROLLER_EXTENSION;
export const VEHICLE_CONTROLLER_EXTENSION_ROUTE =
  process.env.VEHICLE_CONTROLLER_EXTENSION;
export const VEHICLE_DOCUMENT_EXTRA_FIELDS_SCHEMA =
  process.env.VEHICLE_DOCUMENT_EXTRA_FIELDS_SCHEMA;
export const USER_EXTRA_FIELDS_SCHEMA = process.env.USER_EXTRA_FIELDS_SCHEMA;
export const VEHICLE_EXTRA_FIELDS_SCHEMA =
  process.env.VEHICLE_EXTRA_FIELDS_SCHEMA;

export const COMPANY_NAME = process.env.COMPANY_NAME;
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;

export const MOCK_MAIL_API = process.env.MOCK_MAIL_API === "true";
