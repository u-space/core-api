/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { OperationState } from "../entities/operation";

export const NODE_ENV = process.env.NODE_ENV;

if (NODE_ENV === "test") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config({ path: ".env.test" });
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
}

export const jwtSecret: string = process.env.JWTSECRET!; //"@876fyivd&(&*%EH";
export const jwtExpTime: string = process.env.JWT_EXPIRATION_TIME!; //"1h";
export const jwtResetPassSecret: string = process.env.JWT_RESET_PASS_SECRET!;

if (
  NODE_ENV == "production" &&
  (process.env.JWTSECRET == "" || process.env.JWTSECRET == "changeMe")
) {
  throw "You must set a valid JWTSECRET on .env file";
}

export const cert = process.env.SSL_CERT || "./certificate/cert.pem";
export const key = process.env.SSL_KEY || "./certificate/key.pem";
export const keyPhrase = "qwer1234qwer1234";

export const generateOnlyAdmin = true;

export const CRONJOB_ENABLED = process.env.CRONJOB_ENABLED;

export const PORT = process.env.PORT;
export const HTTP_PORT = process.env.HTTP_PORT;

export const GOOGLE_API = process.env.GOOGLE_API;

export const MQTT_ENDPOINT = process.env.MQTT_ENDPOINT;
export const MQTT_USER = process.env.MQTT_USER;
export const MQTT_PASS = process.env.MQTT_PASS;

export const MODULES_TRACKERS = process.env.MODULES_TRACKERS;
export const MODULES_CENTRAL = process.env.MODULES_CENTRAL;
export const MODULES_SURVEILLANCE = process.env.MODULES_SURVEILLANCE;

export const MQTT_ENABLED = process.env.MQTT_ENABLED;

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
export const frontEndAssets = process.env.FRONT_END_ASSETS || "<env-missing>";
export const frontEndUrlMobile =
  process.env.FRONT_END_URL_MOBILE || "http://localhost/";
export const backendUrl = process.env.BACKEND_URL || "http://localhost:4000/";
export const fileServerUrl = backendUrl; // process.env.BACKEND_URL || 'http://localhost:4000/';
export const fileMaxSize = Number(process.env.FILE_MAX_SIZE) || 1024 * 1024 * 5;

export const adminEmail = process.env.ADMIN_EMAIL
  ? process.env.ADMIN_EMAIL.split(",")
  : ["ealonzo@dronfies.com"];

export const uploadFolder = process.env.UPLOAD_FOLDER || "./src/uploads";

export const MOCK_AUTH_SERVER_API = process.env.MOCK_AUTH_SERVER_API;

export const MICROUTM_AUTH_URL =
  process.env.MICROUTM_AUTH_URL || "https://localhost:1737/";

export const REMOTE_ID_URL =
  process.env.REMOTE_ID_URL || "https://localhost:3030/";

export const FRA_URL = process.env.FRA_URL || "https://localhost:3002/";

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
export const APP_NAME = process.env.APP_NAME;
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;

export const MOCK_MAIL_API = process.env.MOCK_MAIL_API === "true";

export const USER_DOCUMENT_EXTRA_FIELDS_SCHEMA =
  process.env.USER_DOCUMENT_EXTRA_FIELDS_SCHEMA;

export const LOGS_ENABLED = process.env.LOGS_ENABLED === "true";

export const OPERATION_DEFAULT_STATE =
  process.env.OPERATION_DEFAULT_STATE === "ACCEPTED"
    ? OperationState.ACCEPTED
    : OperationState.PENDING;

export const OPERATION_PAYMENT_THROW_THE_APP =
  process.env.OPERATION_PAYMENT_THROW_THE_APP === "true";

export const TRY_TO_ACTIVATE_NEW_OPERATIONS =
  process.env.TRY_TO_ACTIVATE_NEW_OPERATIONS === "true";

export const MOCK_SMS_SENDING = process.env.MOCK_SMS_SENDING === "true";
export const MOCK_WHATSAPP_SENDING =
  process.env.MOCK_WHATSAPP_SENDING === "true";

export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
export const TWILIO_FROM_SMS_NUMBER = process.env.TWILIO_FROM_SMS_NUMBER;
export const TWILIO_FROM_WHATSAPP_NUMBER =
  process.env.TWILIO_FROM_WHATSAPP_NUMBER;
export const TWILIO_CONTENT_TEMPLATE_SID_aviso_vuelo_no_tripulado =
  process.env.TWILIO_CONTENT_TEMPLATE_SID_aviso_vuelo_no_tripulado;

export const STRATEGIC_DECONFLICT_MODE_DISABLED: boolean =
  process.env.STRATEGIC_DECONFLICT_MODE === "DISABLED";
