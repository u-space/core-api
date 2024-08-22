import "reflect-metadata";
import { Connection } from "typeorm";
import { createTypeormConn } from "./utils/database-config.utils";
import { UserDao } from "./daos/user.dao";

import * as fs from "fs";
import { parse } from "csv-parse";
import { Document, ReferencedEntityType } from "./entities/document";
import { Role, User } from "./entities/user";
import { exit } from "process";
import { DocumentDao } from "./daos/document.dao";
import {
  VehicleAuthorizeStatus,
  VehicleReg,
  vehicleType,
} from "./entities/vehicle-reg";
import { VehicleDao } from "./daos/vehicle.dao";

const filePathUser =
  "/home/emi/desarrollo/dinacia/documentoMigracion/_user__202405241620.csv";

const filePathVehicle =
  "/home/emi/desarrollo/dinacia/documentoMigracion/vehicle_reg_202405241637.csv";

const filePathVehicleExtraFields =
  "/home/emi/desarrollo/dinacia/documentoMigracion/vehicle_extra_fields_202405241637.csv";

const filePathVehicleOperators =
  "/home/emi/desarrollo/dinacia/documentoMigracion/vehicle_reg_operators_user_202405241637.csv";

let userDao: UserDao; // = new UserDao();
let documentDao: DocumentDao; // = new UserDao();
let vehicleDao: VehicleDao;
// let ormConnection: Connection;

async function initDb() {
  return createTypeormConn("migration").then(async (connection) => {
    // ormConnection = connection;
    userDao = new UserDao();
    documentDao = new DocumentDao();
    vehicleDao = new VehicleDao();
    console.log(`connection.isConnected:${connection.isConnected}`);

    // const user = await userDao.one("emialonzo@gmail.com");
    // console.log(`user:${JSON.stringify(user, null, 2)}`);

    // connection.close();
  });
}

// async function closeDb() {
//   ormConnection.close();
// }

interface DinaciaUser {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  statusId: string;
  settingsLangauge: string;
}

const users = new Map<string, User>();
const documents = [];

const processRoles = (role: string) => {
  switch (role.toLowerCase()) {
    case "admin":
      return Role.ADMIN;
    case "monitor":
      return Role.MONITOR;
    case "pilot":
      return Role.PILOT;
    case "coa":
      return Role.COA;
    case "remote_sensor":
      return Role.REMOTE_SENSOR;
    case "air_traffic":
      return Role.AIR_TRAFIC;
    default:
      return Role.PILOT;
  }
};

function processUsers() {
  fs.createReadStream(filePathUser)
    .pipe(parse({ delimiter: ",", columns: true }))
    .on("data", (row: DinaciaUser) => {
      const cieluUser: User = {
        username: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        role: processRoles(row.role),
        updatedAt: new Date(),
        canOperate: false,
        settings: row.settingsLangauge,
        deletedAt: undefined,
      };
      users.set(row.username, cieluUser);
    })
    .on("end", () => {
      console.log("Archivo CSV procesado exitosamente.");
      processVehicles();
      // processUsersExtraFields();
    })
    .on("error", (error) => {
      console.error("Error al procesar el archivo CSV:", error);
    });
}

interface DinaciaVehicle {
  uvin: string;
  date: string;
  nNumber: string;
  faaNumber: string;
  vehicleName: string;
  manufacturer: string;
  model: string;
  class: string;
  accessType: string;
  vehicleTypeId: string;
  orgUuid: string;
  trackerId: string;
  authorized: string;
  registeredByUsername: string;
  ownerUsername: string;
}

const processVechileType = (type: string): vehicleType => {
  switch (type.toLowerCase()) {
    case "multirotor":
      return vehicleType.MULTIROTOR;
    case "fixedwing":
      return vehicleType.FIXEDWING;
    case "ala fija":
      return vehicleType.FIXEDWING;
    case "vtol":
      return vehicleType.VTOL;
    default:
      return vehicleType.OTHER;
  }
};

const processAutorized = (authorized: string): VehicleAuthorizeStatus => {
  switch (authorized.toLowerCase()) {
    case "authorized":
      return VehicleAuthorizeStatus.AUTHORIZED;
    case "not_authorized":
      return VehicleAuthorizeStatus.NOT_AUTHORIZED;
    case "pending":
      return VehicleAuthorizeStatus.PENDING;
    default:
      return VehicleAuthorizeStatus.PENDING;
  }
};

// const users = new Map<string, User>();
const vehicles = new Map<string, VehicleReg>();

function processVehicles() {
  fs.createReadStream(filePathVehicle)
    .pipe(parse({ delimiter: ",", columns: true }))
    .on("data", (row: DinaciaVehicle) => {
      const vehicle = new VehicleReg();
      vehicle.uvin = row.uvin;
      vehicle.date = row.date;
      vehicle.nNumber = row.nNumber;
      vehicle.faaNumber = row.faaNumber;
      vehicle.vehicleName = row.vehicleName;
      vehicle.manufacturer = row.manufacturer;
      vehicle.model = row.model;
      vehicle.class = processVechileType(row.class);
      vehicle.accessType = row.accessType;
      vehicle.vehicleTypeId = row.vehicleTypeId;
      vehicle.authorized = processAutorized(row.authorized);
      vehicle.registeredBy = users.get(row.registeredByUsername);
      vehicle.owner = users.get(row.ownerUsername);
      vehicle["org-uuid"] = "Vehicle importado de version antigua de utm";
      // vehicles.push(vehicle);
      vehicles.set(row.uvin, vehicle);
    })
    .on("end", () => {
      console.log("Archivo VEHICLE CSV procesado exitosamente.");
      processVehicleExtraFields();
    })
    .on("error", (error) => {
      console.error("Error al procesar el archivo CSV:", error);
    });
}

// dinacia extra fields
// id	vehicleId	authorized	caa_registration	serial_number_file_path	usage	construction_material	year
// serial_number	empty_weight	max_weight	takeoff_method	sensor_type_and_mark	packing	longitude	height
// color	max_speed	cruise_speed	landing_speed	time_autonomy	ceiling
// communication_control_system_command_navigation_vigilance	maintenance_inspections
// remarks	engine_manufacturer	engine_type	engine_model	engine_power
// engine_fuel	engine_quantity_batteries	propeller_type	propeller_model	propeller_material
// remote_sensor_file_path	remote_sensor_id	radio_accion
interface DinaciaVehicleExtraFields {
  id: string;
  vehicleId: string;
  authorized: string;
  caa_registration: string;
  serial_number_file_path: string;
  usage: string;
  construction_material: string;
  year: string;
  serial_number: string;
  empty_weight: string;
  max_weight: string;
  takeoff_method: string;
  sensor_type_and_mark: string;
  packing: string;
  longitude: string;
  height: string;
  color: string;
  max_speed: string;
  cruise_speed: string;
  landing_speed: string;
  engine_fuel: string;
  remote_sensor_file_path: string;
  remote_sensor_id: string;
}

function processVehicleExtraFields() {
  fs.createReadStream(filePathVehicleExtraFields)
    .pipe(parse({ delimiter: ",", columns: true }))
    .on("data", (row: DinaciaVehicleExtraFields) => {
      const vehicle = vehicles.get(row.vehicleId) as VehicleReg;
      if (vehicle) {
        if (!vehicle.extra_fields) {
          vehicle.extra_fields = {
            documents: [],
          };
        }
        if (row.serial_number_file_path) {
          const document = {} as Document;
          document.name = row.serial_number_file_path;
          document.tag = "serial";
          document.valid_until = new Date().toISOString();
          document.observations = "Vehicle importado de version antigua de utm";
          document.valid = true;
          document.extra_fields = {
            serial_number: row.serial_number,
          };
          document.referenced_entity_type = ReferencedEntityType.VEHICLE;
          document.referenced_entity_id = row.vehicleId; // users.get(row.userId)?.email;

          vehicle.extra_fields.documents.push(document);
          documents.push(document);
        }

        if (row.remote_sensor_file_path) {
          const document = {} as Document;
          document.name = row.remote_sensor_file_path;
          document.tag = "remote_sensor_id";
          document.valid_until = new Date().toISOString();
          document.observations = "Vehicle importado de version antigua de utm";
          document.valid = true;
          document.extra_fields = {
            remote_sensor_id_desc: row.remote_sensor_id,
          };
          document.referenced_entity_type = ReferencedEntityType.VEHICLE;
          document.referenced_entity_id = row.vehicleId; // users.get(row.userId)?.email;

          vehicle.extra_fields.documents.push(document);
          documents.push(document);
        }

        vehicle.extra_fields.plate = row.caa_registration; //"IMPORTADO DESDE DINACIA";
        vehicle.extra_fields.use = row.usage; // "IMPORTADO DESDE DINACIA";
        vehicle.extra_fields.propulsion = row.engine_fuel;
      } else {
        console.log(`No se encontro el usuario ${JSON.stringify(row)}`);
      }
    })
    .on("end", () => {
      console.log("Archivo CSV procesado exitosamente.");
      processVehiclesOperators();
    })
    .on("error", (error) => {
      console.error("Error al procesar el archivo CSV:", error);
    });
}

interface DinaciaUserExtraFields {
  vehicleRegUvin: string;
  userUsername: string;
}

async function processVehiclesOperators() {
  fs.createReadStream(filePathVehicleOperators)
    .pipe(parse({ delimiter: ",", columns: true }))
    .on("data", (row: DinaciaUserExtraFields) => {
      // console.log(row);
      const vehicle = vehicles.get(row.vehicleRegUvin) as VehicleReg;
      const user = users.get(row.userUsername) as User;
      if (vehicle && user) {
        if (!vehicle.operators) {
          vehicle.operators = [];
        }
        vehicle.operators.push(user);
      } else {
        console.log(`No se encontro ${JSON.stringify(row)}`);
      }
    })
    .on("end", () => {
      console.log("Archivo CSV procesado exitosamente.");
      logVehicles();
    })
    .on("error", (error) => {
      console.error("Error al procesar el archivo CSV:", error);
    });
}

async function logVehicles() {
  console.log("-----------------------");
  const arrayVehicles = Array.from(vehicles.entries());
  for (const [vhicelUvin, vehicle] of arrayVehicles) {
    console.log(`${vhicelUvin}: ${JSON.stringify(vehicle, null, 2)}`);
    try {
      if (
        vehicle.extra_fields?.documents &&
        vehicle.extra_fields?.documents.length > 0
      ) {
        for (const doc of vehicle.extra_fields.documents) {
          await documentDao.save(doc);
          console.log(
            "console log save document " + JSON.stringify(doc, null, 2)
          );
          console.log("  ");
        }
        vehicle.extra_fields.documents = vehicle.extra_fields.documents.map(
          (document: Document) => document.id
        );
      }
    } catch (error) {
      console.log("******* console log save document error " + error);
    }
    try {
      console.log("******************************");
      const nv = await vehicleDao.add(vehicle, vehicle.registeredBy!.username);

      console.log(`vehicle guardado ${JSON.stringify(nv, null, 2)}`);
    } catch (error) {
      console.log("******** error al guardar vehiculo ");
      console.log(error);
    }
  }
  console.log("#documents=" + documents.length);
  console.log("-----------------------");
}

async function main() {
  await initDb();
  processUsers();
}

main();
