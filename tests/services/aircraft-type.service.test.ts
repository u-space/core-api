import { DataSource } from "typeorm";
import { AircraftTypeDaoTypeOrmImp } from "../../src/daos/typeorm-imp/aircraft-type.dao";
import AircraftTypeService from "../../src/services/aircraft-type.service";
import { AAAAircratType, AAAVehicleType } from "../../src/types";
import {
  TESTS_DB_HOST,
  TESTS_DB_PORT,
  TESTS_DB_USERNAME,
  TESTS_DB_PASSWORD,
  TESTS_DB_DATABASE,
} from "../../src/utils/config.utils";
import { areObjectsEqual } from "./_utils";

let dataSource: DataSource;
let aircraftTypeService: AircraftTypeService;
const aircraftTypes: AAAAircratType[] = [
  {
    manufacturer: "DJI",
    model: "Phantom 4",
    class: AAAVehicleType.MULTIROTOR,
    mtom: "some mtom",
    time_autonomy: 20 * 60,
    pilot: "john",
    band: "some band",
    color: "white",
    lights: "no",
    load_weight: 0,
    vhf: false,
    visual_front_sensor: "no",
    dimension: "20x10x30",
    energy: "low",
  },
  {
    manufacturer: "Parrot",
    model: "Anafi",
    class: AAAVehicleType.FIXEDWING,
    mtom: "another mtom",
    time_autonomy: 15 * 60,
    pilot: "tom",
    band: "another band",
    color: "black",
    lights: "yes",
    load_weight: 3,
    vhf: true,
    visual_front_sensor: "yes",
    dimension: "some dimensions",
    energy: "high",
  },
];

beforeAll(async () => {
  // create data source
  dataSource = new DataSource({
    type: "postgres",
    host: TESTS_DB_HOST,
    port: Number(TESTS_DB_PORT),
    username: TESTS_DB_USERNAME,
    password: TESTS_DB_PASSWORD,
    database: TESTS_DB_DATABASE,
    synchronize: false,
    dropSchema: false,
    logging: false,
    ssl: false,
    entities: [`${__dirname}/../../src/entities/**/*.ts`],
    migrations: [`${__dirname}/../../src/migration/**/*.ts`],
    subscribers: [`${__dirname}/../../src/subscriber/**/*.ts`],
  });

  // initialize data source
  await dataSource.initialize();

  // create notam service
  aircraftTypeService = new AircraftTypeService(
    new AircraftTypeDaoTypeOrmImp(dataSource)
  );
});

afterAll(async () => {
  // destroy data source
  await dataSource.destroy();
});

describe("AircraftTypeService", () => {
  it("Save some valid aircraft types", async () => {
    for (let i = 0; i < aircraftTypes.length; i++) {
      const aircraftType = aircraftTypes[i];
      const aircraftTypeSaved = await aircraftTypeService.saveAircraftType(
        aircraftTypes[i]
      );
      expect(aircraftTypeSaved.id).not.toBe(undefined);
      expect(aircraftType.manufacturer).toBe(aircraftTypeSaved.manufacturer);
      expect(aircraftType.model).toBe(aircraftTypeSaved.model);
      expect(aircraftType.class).toBe(aircraftTypeSaved.class);
      expect(aircraftType.mtom).toBe(aircraftTypeSaved.mtom);
      expect(aircraftType.time_autonomy).toBe(aircraftTypeSaved.time_autonomy);
      expect(aircraftType.pilot).toBe(aircraftTypeSaved.pilot);
      expect(aircraftType.band).toBe(aircraftTypeSaved.band);
      expect(aircraftType.color).toBe(aircraftTypeSaved.color);
      expect(aircraftType.lights).toBe(aircraftTypeSaved.lights);
      expect(aircraftType.load_weight).toBe(aircraftTypeSaved.load_weight);
      expect(aircraftType.vhf).toBe(aircraftTypeSaved.vhf);
      expect(aircraftType.visual_front_sensor).toBe(
        aircraftTypeSaved.visual_front_sensor
      );
      expect(aircraftType.dimension).toBe(aircraftTypeSaved.dimension);
      expect(aircraftType.energy).toBe(aircraftTypeSaved.energy);
      aircraftType.id = aircraftTypeSaved.id;
    }
  });

  it("Try to save invalid aircraft types", async () => {
    // aircraft type with id
    await expect(
      aircraftTypeService.saveAircraftType({
        id: 1,
        manufacturer: "DJI",
        model: "Phantom 4",
        class: AAAVehicleType.MULTIROTOR,
        mtom: "some mtom",
        time_autonomy: 20 * 60,
        pilot: "john",
        band: "some band",
        color: "white",
        lights: "no",
        load_weight: 0,
        vhf: false,
        visual_front_sensor: "no",
        dimension: "20x10x30",
        energy: "low",
      })
    ).rejects.toThrow();
  });

  it("Verify all aircraft types where saved using getAircraftTypes method", async () => {
    const dbAircraftTypes = await aircraftTypeService.getAircraftTypes();

    // verify dbAircraftTypes has the same size that aircraftTypes
    expect(dbAircraftTypes.length).toBe(aircraftTypes.length);

    // verify all aircraft types are in dbAircraftTypes
    for (let i = 0; i < aircraftTypes.length; i++) {
      const aircraftType = aircraftTypes[i];
      let aircraftTypeFound = false;
      for (let j = 0; j < dbAircraftTypes.length; j++) {
        const dbAircraftType = dbAircraftTypes[j];
        if (areObjectsEqual(aircraftType, dbAircraftType)) {
          aircraftTypeFound = true;
          break;
        }
      }
      expect(aircraftTypeFound).toBeTruthy();
    }
  });

  it("Get all aircraft types by the id", async () => {
    for (let i = 0; i < aircraftTypes.length; i++) {
      const aircraftType = aircraftTypes[i];
      const dbAircraftType = await aircraftTypeService.getAircraftType(
        aircraftType.id!
      );
      expect(areObjectsEqual(dbAircraftType, aircraftType)).toBeTruthy();
    }
  });
});
