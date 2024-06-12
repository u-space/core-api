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

exit();

const filePathUser =
  "/home/emi/desarrollo/dinacia/documentoMigracion/_user__202405241620.csv";

const filePathUserExtraFields =
  "/home/emi/desarrollo/dinacia/documentoMigracion/user_extra_fields_202405241621.csv";

let userDao: UserDao; // = new UserDao();
let documentDao: DocumentDao; // = new UserDao();
// let ormConnection: Connection;

async function initDb() {
  return createTypeormConn("migration").then(async (connection) => {
    // ormConnection = connection;
    userDao = new UserDao();
    documentDao = new DocumentDao();
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

const processRoles = (role: string) => {
  switch (role.toLowerCase()) {
    case "admin":
      return Role.ADMIN;
    case "monitor":
      return Role.MONITOR;
    case "pilot":
      return Role.PILOT;
    default:
      return Role.PILOT;
  }
};

function processUsers() {
  fs.createReadStream(filePathUser)
    .pipe(parse({ delimiter: ",", columns: true }))
    .on("data", (row: DinaciaUser) => {
      console.log(`Usuario: ${row.username}`);
      console.log(`Nombre: ${row.firstName}`);
      console.log(`Apellido: ${row.lastName}`);
      console.log(`Email: ${row.email}`);
      console.log(`Rol: ${row.role}`);
      console.log(`ID de Estado: ${row.statusId}`);
      console.log(`Idioma de Configuración: ${row.settingsLangauge}`);
      console.log("-----------------------");
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
      processUsersExtraFields();
    })
    .on("error", (error) => {
      console.error("Error al procesar el archivo CSV:", error);
    });
}

// user extra fields
// id	userId	address	document_type	document_number	phone	cellphone	nationality	company_razon_social	company_nombre_comercial	company_domicilio	company_telefono	company_RUT	permit_expire_date	document_file_path	permit_front_file_path	permit_back_file_path	hasCertifications
interface DinaciaUserExtraFields {
  id: string;
  userId: string;
  address: string;
  document_type: string;
  document_number: string;
  phone: string;
  cellphone: string;
  nationality: string;
  company_razon_social: string;
  company_nombre_comercial: string;
  company_domicilio: string;
  company_telefono: string;
  company_RUT: string;
  permit_expire_date: string;
  document_file_path: string;
  permit_front_file_path: string;
  permit_back_file_path: string;
  hasCertifications: boolean;
}

function processUsersExtraFields() {
  fs.createReadStream(filePathUserExtraFields)
    .pipe(parse({ delimiter: ",", columns: true }))
    .on("data", (row: DinaciaUserExtraFields) => {
      const u = users.get(row.userId) as User;
      if (u) {
        if (!u.extra_fields) {
          u.extra_fields = {
            documents: [],
          };
        }
        if (row.document_file_path) {
          const document = {} as Document;
          document.name = row.document_file_path;
          document.tag = "userDocument";
          document.valid_until = new Date().toISOString();
          document.observations = "Importado de version antigua de utm";
          document.valid = true;
          document.extra_fields = {
            document_number: row.document_number,
          };
          document.referenced_entity_type = ReferencedEntityType.USER;
          // document.referenced_entity_id = row.userId;
          document.referenced_entity_id = users.get(row.userId)?.email;

          u.extra_fields.documents.push(document);
        }
        if (row.permit_front_file_path) {
          const document = {} as Document;
          document.name = row.document_file_path;
          document.tag = "pilotLicense";
          document.valid_until = row.permit_expire_date; //new Date(row.permit_expire_date).toISOString();
          document.observations = "Importado de version antigua de utm";
          document.valid = true;
          document.extra_fields = {
            // document_number: row.document_number
          };
          document.referenced_entity_type = ReferencedEntityType.USER;
          // document.referenced_entity_id = row.userId;
          document.referenced_entity_id = users.get(row.userId)?.email;

          u.extra_fields.documents.push(document);
        }
        u.extra_fields.city = "IMPORTADO DESDE DINACIA";
        u.extra_fields.country = row.nationality;
        u.extra_fields.address = row.address;
        u.extra_fields.phone = row.cellphone || row.phone;
        u.extra_fields.company_RUT = row.company_RUT;
        u.extra_fields.company_razon_social = row.company_razon_social;
      } else {
        console.log(`No se encontro el usuario ${JSON.stringify(row)}`);
      }
    })
    .on("end", () => {
      console.log("Archivo CSV procesado exitosamente.");
      logUsers();
    })
    .on("error", (error) => {
      console.error("Error al procesar el archivo CSV:", error);
    });
}

async function logUsers() {
  console.log("-----------------------");
  const arrayUsers = Array.from(users.entries());
  for (const [oldUsername, user] of arrayUsers) {
    console.log(`${oldUsername}: ${JSON.stringify(user, null, 2)}`);
    try {
      if (
        user.extra_fields?.documents &&
        user.extra_fields?.documents.length > 0
      ) {
        // const newDocs = [];
        for (const doc of user.extra_fields.documents) {
          await documentDao.save(doc);
          console.log(
            "console log save document " + JSON.stringify(doc, null, 2)
          );
          console.log("  ");
          // newDocs.push(newDoc);
        }
        // user.extra_fields.documents = newDocs;
      }
    } catch (error) {
      console.log("******* console log save document error " + error);
    }
    try {
      await userDao.save(user);
      console.log("console log save user " + user.username);
    } catch (error) {
      console.log("******** console log save user error " + error);
    }
  }
  console.log("-----------------------");
}

async function main() {
  await initDb();
  processUsers();
}

main();
