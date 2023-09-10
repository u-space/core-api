/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { UserController } from "./controllers/user.controller";
import { VehicleController } from "./controllers/vehicle.controller";
import { OperationController } from "./controllers/operation.controller";
import { UTMMessageController } from "./controllers/utm-message.controller";
import { AuthController } from "./controllers/auth.controller";
import { PositionController } from "./controllers/position.controller";
import { UASVolumeReservationController } from "./controllers/uas-volume-reservation.controller";
import { NotamController } from "./controllers/notam.controller";
import { RestrictedFlightVolumeController } from "./controllers/restricted-flight-volume.controller";
import { MailController } from "./controllers/mail.controller";
import { RegularFlightController } from "./controllers/regular-flight.controller";

import {
  checkJwt,
  checkJwtButDoNotFail,
} from "./middleware/check-jwt.middleware";
import { isAdminUser, isAdminOrPilotUser } from "./middleware/other-middleware";

import { body, query } from "express-validator";
import { VersionController } from "./controllers/version.controller";
import { SchemasController } from "./controllers/schema.controller";
import { PilotPositionController } from "./controllers/pilot-position.controller";
import { TrackersController } from "./controllers/tracker.controller";
import { checkModuleEnabled } from "./middleware/check-module-enabled.middleware";
import { VertiportController } from "./controllers/vertiport.controller";
import { AircraftTypeController } from "./controllers/aircraft-type.controller";
import { DocumentRestController } from "./controllers/document.controller";
import TestController from "./controllers/test.controller";
import { NODE_ENV } from "./utils/config.utils";
import { MigrationController } from "./controllers/migration.controller";
import { TelemetryController } from "./controllers/telemetry.controller";

interface CustomRoute {
  method: string;
  route: string;
  controller: unknown;
  action: string;
  middlewares?: unknown;
}

const doRoutes = (
  route: string,
  Dao: unknown,
  checkJwtButDoNotFailInGetAll = false
) => {
  return [
    {
      method: "get",
      route: `/${route}`,
      controller: Dao,
      action: "all",
      middlewares: checkJwtButDoNotFailInGetAll
        ? [checkJwtButDoNotFail]
        : [checkJwt],
    },
    {
      method: "get",
      route: `/${route}/:id`,
      controller: Dao,
      action: "one",
      middlewares: [checkJwt],
    },
    {
      method: "post",
      route: `/${route}`,
      controller: Dao,
      action: "save",
      middlewares: [checkJwt, isAdminOrPilotUser],
    },
    {
      method: "delete",
      route: `/${route}/:id`,
      controller: Dao,
      action: "remove",
      middlewares: [checkJwt, isAdminOrPilotUser],
    },
  ];
};

const test = [
  {
    method: "post",
    route: "/test/initDB",
    controller: TestController,
    action: "initDB",
    middlewares: [],
  },
];

const operations = [
  {
    method: "post",
    route: "/operation/activatedByLocation",
    controller: OperationController,
    action: "activatedOperationByLocation",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/operation/express",
    controller: OperationController,
    action: "expressOperation",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "post",
    route: "/operation/geo",
    controller: OperationController,
    action: "getOperationByPoint",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/operation/volume",
    controller: OperationController,
    action: "getOperationByVolumeOperation",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "get",
    route: "/operation/creator",
    controller: OperationController,
    action: "operationsByCreator",
    middlewares: [checkJwt],
  },
  {
    method: "get",
    route: "/operation/owner",
    controller: OperationController,
    action: "operationsByOwner",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/operation/:id/pendingtoaccept",
    controller: OperationController,
    action: "acpetPendingOperation",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "post",
    route: "/operation/:id/updatestate",
    controller: OperationController,
    action: "updateState",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "post",
    route: "/operation/:id/close",
    controller: OperationController,
    action: "closeOwnOperation",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  ...doRoutes("operation", OperationController, true),
];

const user = [
  {
    method: "post",
    route: "/user/register",
    controller: UserController,
    action: "userRegister",
    // middlewares: [checkJwt]
  },
  {
    method: "put",
    route: "/user",
    controller: UserController,
    action: "updateUser",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "put",
    route: "/user/password/:id",
    controller: UserController,
    action: "updateUserPassword",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "post",
    route: "/user/updateStatus",
    controller: UserController,
    action: "updateUserStatus",
  },
  {
    method: "post",
    route: "/user/updateUserStatus",
    controller: UserController,
    action: "updateUserStatus",
    middlewares: [checkJwt],
  },
  {
    method: "get",
    route: "/user/exists/:username",
    controller: UserController,
    action: "userExists",
    middlewares: [checkJwt],
  },
  {
    method: "patch",
    route: "/user/restore/:username",
    controller: UserController,
    action: "enable",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/user/:username/document",
    controller: UserController,
    action: "addDocument",
    middlewares: [checkJwt],
  },
  {
    method: "get",
    route: "/user/document/tags",
    controller: UserController,
    action: "getDocumentTags",
    middlewares: [],
  },
  {
    method: "get",
    route: "/user/document/schema",
    controller: UserController,
    action: "getDocumentExtraFieldSchemas",
    middlewares: [],
  },
  {
    method: "get",
    route: "/user/document/schema/:tag",
    controller: UserController,
    action: "getDocumentExtraFieldSchemaByTag",
    middlewares: [],
  },
  {
    method: "patch",
    route: "/user/:username/document",
    controller: UserController,
    action: "updateDocument",
    middlewares: [checkJwt],
  },
  {
    method: "delete",
    route: "/user/:username/document/:documentId",
    controller: UserController,
    action: "deleteDocument",
    middlewares: [checkJwt],
  },
  ...doRoutes("user", UserController),
];

const auth = [
  {
    method: "post",
    route: "/auth/login",
    controller: AuthController,
    action: "login",
    middlewares: [],
  },
  {
    method: "post",
    route: "/auth/relogin",
    controller: AuthController,
    action: "relogin",
    middlewares: [
      // input request validations
      body("format")
        .optional()
        .trim()
        .toLowerCase()
        .matches(/^json$/),
    ],
  },
  {
    method: "post",
    route: "/auth/clear",
    controller: AuthController,
    action: "clearCookies",
  },
  {
    method: "post",
    route: "/auth/forgot-password",
    controller: AuthController,
    action: "forgotPassword",
    middlewares: [],
  },
  {
    method: "post",
    route: "/auth/reset-password",
    controller: AuthController,
    action: "resetPassword",
    middlewares: [],
  },
  {
    method: "post",
    route: "/auth/mqtt/acl",
    controller: AuthController,
    action: "mqttAcl",
  },
];

const mail = [
  {
    method: "post",
    route: "/mail/pending",
    controller: MailController,
    action: "sendMailForPendingOperation",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/mail/operation",
    controller: MailController,
    action: "sendOperationMail",
    middlewares: [checkJwt],
  },
];

const positions = [
  {
    method: "post",
    route: "/position/drone",
    controller: PositionController,
    action: "savePositionWithDrone",
    middlewares: [
      checkJwt,
      isAdminOrPilotUser,
      // input request validations
      body("heading").optional().isNumeric(),
      body("location.type")
        .trim()
        .toLowerCase()
        .matches(/^point$/),
      body("location.coordinates").isArray({ min: 2, max: 2 }),
      body("altitude_gps").isNumeric(),
      body("time_sent")
        .optional()
        .matches(
          /^(19|20)\d\d-(0[1-9]|1[012])-([012]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d).(\d)(\d)(\d)Z$|^(19|20)\d\d-(0[1-9]|1[012])-([012]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)Z/
        ),
    ],
  },
  {
    method: "get",
    route: "/position/date",
    controller: PositionController,
    action: "oneByGufiWithDates",
    middlewares: [
      checkJwt,
      // input request validations
      query("gufi").isString().trim().not().isEmpty(),
      query("time_start").isISO8601().not().isEmpty(),
      query("time_end").isISO8601().not().isEmpty(),
    ],
  },
  {
    method: "post",
    route: "/position/tracker",
    controller: PositionController,
    action: "savePositionWithDroneTrackerIdWebService",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "get",
    route: "/position/:id",
    controller: PositionController,
    action: "one",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/position",
    controller: PositionController,
    action: "save",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "delete",
    route: "/position/:id",
    controller: PositionController,
    action: "remove",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
];

const vehicles = [
  {
    method: "get",
    route: "/vehicle/operator",
    controller: VehicleController,
    action: "allVehiclesOperator",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/vehicle/authorize",
    controller: VehicleController,
    action: "authorizeVehicle",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "get",
    route: "/vehicle",
    controller: VehicleController,
    action: "all",
    middlewares: [checkJwt],
  },
  {
    method: "get",
    route: "/vehicle/:id",
    controller: VehicleController,
    action: "one",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/vehicle",
    controller: VehicleController,
    action: "save",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "post",
    route: "/vehicle/:uvin/document",
    controller: VehicleController,
    action: "addDocument",
    middlewares: [checkJwt],
  },
  {
    method: "patch",
    route: "/vehicle/:uvin/document",
    controller: VehicleController,
    action: "updateDocument",
    middlewares: [checkJwt],
  },
  {
    method: "delete",
    route: "/vehicle/:uvin/document/:documentId",
    controller: VehicleController,
    action: "deleteDocument",
    middlewares: [checkJwt],
  },
  {
    method: "get",
    route: "/vehicle/document/tags",
    controller: VehicleController,
    action: "getDocumentTags",
    middlewares: [],
  },
  {
    method: "get",
    route: "/vehicle/document/schema",
    controller: VehicleController,
    action: "getDocumentExtraFieldSchemas",
    middlewares: [],
  },
  {
    method: "get",
    route: "/vehicle/document/schema/:tag",
    controller: VehicleController,
    action: "getDocumentExtraFieldSchemaByTag",
    middlewares: [],
  },
];

const regularFlights = [
  {
    method: "get",
    route: "/regularFlights",
    controller: RegularFlightController,
    action: "all",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/regularFlights",
    controller: RegularFlightController,
    action: "save",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/regularFlights/operation",
    controller: OperationController,
    action: "createOperationFromRegularFlight",
    middlewares: [checkJwt],
  },
  {
    method: "get",
    route: "/regularFlights/:id",
    controller: RegularFlightController,
    action: "one",
    middlewares: [checkJwt],
  },
];

const restrictedFlightVolumes = [
  {
    method: "get",
    route: "/restrictedflightvolume",
    controller: RestrictedFlightVolumeController,
    action: "all",
  },
  {
    method: "get",
    route: "/restrictedflightvolume/:id",
    controller: RestrictedFlightVolumeController,
    action: "one",
  },
  {
    method: "post",
    route: "/restrictedflightvolume",
    controller: RestrictedFlightVolumeController,
    action: "save",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "delete",
    route: "/restrictedflightvolume/:id",
    controller: RestrictedFlightVolumeController,
    action: "remove",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
];

const uasVolumeReservation = [
  {
    method: "get",
    route: "/uasvolume",
    controller: UASVolumeReservationController,
    action: "all",
  },
  {
    method: "get",
    route: "/uasvolume/:id",
    controller: UASVolumeReservationController,
    action: "one",
  },
  {
    method: "post",
    route: "/uasvolume",
    controller: UASVolumeReservationController,
    action: "save",
    middlewares: [checkJwt, isAdminUser],
  },
  {
    method: "delete",
    route: "/uasvolume/:id",
    controller: UASVolumeReservationController,
    action: "remove",
    middlewares: [checkJwt, isAdminUser],
  },
];

const publicEndpoint = [
  {
    method: "get",
    route: "/publicOperations",
    controller: OperationController,
    action: "getPublicOperations",
  },
  {
    method: "get",
    route: "/publicOperation/:id",
    controller: OperationController,
    action: "getOnePublicOperation",
  },
];

const schemas = [
  {
    method: "get",
    route: "/schemas",
    controller: SchemasController,
    action: "getSchemas",
  },
];

const version = [
  {
    method: "get",
    route: "/version",
    controller: VersionController,
    action: "version",
  },
];

const vertiports = [
  {
    method: "get",
    route: "/vertiports",
    controller: VertiportController,
    action: "all",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/vertiports",
    controller: VertiportController,
    action: "save",
    middlewares: [checkJwt],
  },
];

const pilotPosition = [
  {
    method: "post",
    route: "/pilotPosition",
    controller: PilotPositionController,
    action: "save",
    middlewares: [
      checkJwt,
      isAdminOrPilotUser,
      // input request validations
      body("altitude_gps").isNumeric().not().isEmpty(),
      body("location").isObject().not().isEmpty(),
      body("time_sent").isISO8601().not().isEmpty(),
      body("gufi").isString().not().isEmpty(),
    ],
  },
];

const trackers = [
  {
    method: "post",
    route: "/central/trackers",
    controller: TrackersController,
    action: "saveCentral",
    middlewares: [
      checkJwt,
      isAdminOrPilotUser,
      checkModuleEnabled("trackers"),
      checkModuleEnabled("central"),
      body("hardware_id").isString().not().isEmpty(),
      body("directory").isArray().not().isEmpty(),
    ],
  },
  {
    method: "post",
    route: "/trackers",
    controller: TrackersController,
    action: "save",
    middlewares: [
      checkJwt,
      isAdminOrPilotUser,
      checkModuleEnabled("trackers"),
      checkModuleEnabled("central", true),
      body("hardware_id").isString().not().isEmpty(),
      body("uvin").isString().not().isEmpty(),
    ],
  },
  {
    method: "get",
    route: "/trackers",
    controller: TrackersController,
    action: "all",
    middlewares: [checkJwt, checkModuleEnabled("trackers")],
  },
  {
    method: "get",
    route: "/trackers/rssi",
    controller: TrackersController,
    action: "getRSSI",
    middlewares: [checkJwt, checkModuleEnabled("trackers")],
  },
  {
    method: "get",
    route: "/trackers/:id",
    controller: TrackersController,
    action: "getById",
    middlewares: [checkJwt, checkModuleEnabled("trackers")],
  },
];

const aircraftTypeRoutes = [
  {
    method: "get",
    route: "/aircraftType",
    controller: AircraftTypeController,
    action: "all",
  },
  {
    method: "get",
    route: "/aircraftType/:id",
    controller: AircraftTypeController,
    action: "one",
    middlewares: [checkJwt],
  },
  {
    method: "post",
    route: "/aircraftType",
    controller: AircraftTypeController,
    action: "save",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
  {
    method: "delete",
    route: "/aircraftType/:id",
    controller: AircraftTypeController,
    action: "remove",
    middlewares: [checkJwt, isAdminOrPilotUser],
  },
];

const document = [
  // {
  // 	method: 'get',
  // 	route: '/document/schema/:type/',
  // 	controller: DocumentRestController,
  // 	action: 'getDocumentTypeExtraFieldSchema',
  // 	middlewares: [checkJwt]
  // },
  {
    method: "patch",
    route: "/document/:id/validate",
    controller: DocumentRestController,
    action: "validateDocument",
    middlewares: [checkJwt, isAdminUser],
  },
  {
    method: "patch",
    route: "/document/:id/invalidate",
    controller: DocumentRestController,
    action: "invalidateDocument",
    middlewares: [checkJwt, isAdminUser],
  },
  {
    method: "post",
    route: "/document/:id/observation",
    controller: DocumentRestController,
    action: "sendObservation",
    middlewares: [checkJwt, isAdminUser],
  },
  {
    method: "get",
    route: "/document/:id/schema/",
    controller: DocumentRestController,
    action: "getDocumentExtraFieldSchema",
    middlewares: [checkJwt],
  },
  {
    method: "delete",
    route: "/document/",
    controller: DocumentRestController,
    action: "removeOrphanFiles",
    middlewares: [checkJwt, isAdminUser],
  },
  {
    method: "get",
    route: "/uploads/:id",
    controller: DocumentRestController,
    action: "getUpload",
    middlewares: [],
  },
  ...doRoutes("document", DocumentRestController),
];

const migrations = [
  {
    method: "post",
    route: "/migrations/execute/:id",
    controller: MigrationController,
    action: "executeMigration",
    middlewares: [checkJwt, isAdminUser],
  },
];

const telemetries = [
  {
    method: "post",
    route: "/telemetries",
    controller: TelemetryController,
    action: "postTelemetry",
    middlewares: [checkJwt],
  },
];

const r: CustomRoute[] = [
  ...user, // ...doRoutes("user",UserController),
  ...doRoutes("notam", NotamController),
  ...document, //...doRoutes('document', DocumentRestController),
  ...doRoutes("utmmessage", UTMMessageController),
  ...uasVolumeReservation,
  ...regularFlights,
  ...restrictedFlightVolumes,
  ...vehicles,
  ...positions,
  ...operations,
  ...auth,
  ...mail,
  ...publicEndpoint,
  ...version,
  ...vertiports,
  ...pilotPosition,
  ...trackers,
  ...schemas,
  ...aircraftTypeRoutes,
  ...migrations,
  ...telemetries,
];
if (NODE_ENV === "test") {
  r.push(...test);
}

export const Routes = r;
