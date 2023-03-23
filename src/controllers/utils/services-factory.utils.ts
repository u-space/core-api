import { DataSource } from "typeorm";
import { AircraftTypeDaoTypeOrmImp } from "../../daos/typeorm-imp/aircraft-type.dao";
import { NotamDaoTypeOrmImp } from "../../daos/typeorm-imp/notam.dao";
import AircraftTypeService from "../../services/aircraft-type.service";
import NotamService from "../../services/notam.service";
import {
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_DATABASE,
} from "../../utils/config.utils";

let aircraftTypeService: AircraftTypeService;
let notamService: NotamService;

export async function initializeServices(): Promise<void> {
  // create and initialize data source
  const dataSource = new DataSource({
    type: "postgres",
    host: DB_HOST,
    port: Number(DB_PORT),
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    synchronize: false,
    dropSchema: false,
    logging: false,
    ssl: false,
    entities: [`${__dirname}/../../entities/**/*.ts`],
    migrations: [`${__dirname}/../../migration/**/*.ts`],
    subscribers: [`${__dirname}/../../subscriber/**/*.ts`],
  });
  await dataSource.initialize();

  // create services
  aircraftTypeService = new AircraftTypeService(
    new AircraftTypeDaoTypeOrmImp(dataSource)
  );
  notamService = new NotamService(new NotamDaoTypeOrmImp(dataSource));
}

export function getAircraftTypeService(): AircraftTypeService {
  return aircraftTypeService;
}

export function getNotamService(): NotamService {
  return notamService;
}
