import { DataSource } from "typeorm";
import { NotamDaoTypeOrmImp } from "../../src/daos/typeorm-imp/notam.dao";
import NotamService from "../../src/services/notam.service";
import { AAANotams } from "../../src/types";
import {
  TESTS_DB_HOST,
  TESTS_DB_PORT,
  TESTS_DB_USERNAME,
  TESTS_DB_PASSWORD,
  TESTS_DB_DATABASE,
} from "../../src/utils/config.utils";

let dataSource: DataSource;
let notamService: NotamService;
const notams: AAANotams[] = [
  {
    text: "notam1",
    geography: {
      type: "Polygon",
      coordinates: [
        [
          [-56, 34],
          [-56, 35],
          [-55, 35],
          [-56, 34],
        ],
      ],
    },
    effective_time_begin: new Date(2023, 2, 20, 14, 0, 0, 0),
    effective_time_end: new Date(2023, 2, 20, 16, 0, 0, 0),
  },
  {
    text: "notam2",
    geography: {
      type: "Polygon",
      coordinates: [
        [
          [20, 34],
          [20, 35],
          [21, 35],
          [20, 34],
        ],
      ],
    },
    effective_time_begin: new Date(2023, 2, 22, 8, 0, 0, 0),
    effective_time_end: new Date(2023, 2, 22, 16, 0, 0, 0),
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
    synchronize: true,
    dropSchema: true,
    logging: false,
    ssl: false,
    entities: [`${__dirname}/../../src/entities/**/*.ts`],
    migrations: [`${__dirname}/../../src/migration/**/*.ts`],
    subscribers: [`${__dirname}/../../src/subscriber/**/*.ts`],
  });

  // initialize data source
  await dataSource.initialize();

  // create notam service
  notamService = new NotamService(new NotamDaoTypeOrmImp(dataSource));
});

afterAll(async () => {
  // destroy data source
  await dataSource.destroy();
});

describe("NotamService", () => {
  it("Save some valid notams", async () => {
    for (let i = 0; i < notams.length; i++) {
      const notam = notams[i];
      const notamSaved = await notamService.saveNotam(notams[i]);
      expect(notamSaved.message_id).not.toBe(undefined);
      expect(notam.text).toBe(notamSaved.text);
      expect(notam.geography).toBe(notamSaved.geography);
      expect(notam.effective_time_begin.toString()).toBe(
        notamSaved.effective_time_begin.toString()
      );
      expect(notam.effective_time_end.toString()).toBe(
        notamSaved.effective_time_end.toString()
      );
      notam.message_id = notamSaved.message_id;
    }
  });

  it("Try to save invalid notams", async () => {
    // notam with id
    await expect(
      notamService.saveNotam({
        message_id: "1234",
        text: "",
        geography: {
          type: "Polygon",
          coordinates: [
            [
              [20, 34],
              [20, 35],
              [21, 35],
              [20, 34],
            ],
          ],
        },
        effective_time_begin: new Date(),
        effective_time_end: new Date(),
      })
    ).rejects.toThrow();

    // notam that effective_time_begin === effective_time_end
    const date = new Date();
    await expect(
      notamService.saveNotam({
        text: "",
        geography: {
          type: "Polygon",
          coordinates: [
            [
              [20, 34],
              [20, 35],
              [21, 35],
              [20, 34],
            ],
          ],
        },
        effective_time_begin: date,
        effective_time_end: date,
      })
    ).rejects.toThrow();
  });

  it("Verify all notams where saved using getNotams method", async () => {
    const dbNotams = await notamService.getNotams();

    // verify dbNotams has the same size that notams
    expect(dbNotams.length).toBe(notams.length);

    // verify all notams are in dbNotams
    for (let i = 0; i < notams.length; i++) {
      const notam = notams[i];
      let notamFound = false;
      for (let j = 0; j < dbNotams.length; j++) {
        const dbNotam = dbNotams[j];
        if (areObjectsEqual(notam, dbNotam)) {
          notamFound = true;
          break;
        }
      }
      expect(notamFound).toBeTruthy();
    }
  });

  it("Get all notams by the id", async () => {
    for (let i = 0; i < notams.length; i++) {
      const notam = notams[i];
      const dbNotam = await notamService.getNotam(notam.message_id!);
      expect(areObjectsEqual(dbNotam, notam)).toBeTruthy();
    }
  });

  it("Verify that if I try to get a notam with an invalid id, getNotam throws an error", async () => {
    await expect(
      notamService.getNotam("there is no notam with this id")
    ).rejects.toThrow();
  });

  it("Remove notams", async () => {
    // try to remove an unexistent notam
    await expect(
      notamService.getNotam("there is no notam with this id")
    ).rejects.toThrow();

    // remove all notams
    for (let i = 0; i < notams.length; i++) {
      const notam = notams[i];
      // remove notam
      await notamService.removeNotam(notam.message_id!);
      // try to remove notam again
      await expect(
        notamService.removeNotam(notam.message_id!)
      ).rejects.toThrow();
      // try to get notam
      await expect(notamService.getNotam(notam.message_id!)).rejects.toThrow();
    }

    // get all notams must return empty array
    const dbNotams = await notamService.getNotams();
    expect(dbNotams.length).toBe(0);
  });
});

// ----------------------------------------------------------------
// ---------------------- PRIVATE FUNCTIONS  ----------------------
// ----------------------------------------------------------------

function areObjectsEqual(obj1: any, obj2: any): boolean {
  // base cases
  if (typeof obj1 !== typeof obj2) return false;
  if (typeof obj1 === "undefined") return true;
  if (typeof obj1 === "string") return obj1 === obj2;
  if (typeof obj1 === "number") return obj1 === obj2;
  if (typeof obj1 === "boolean") return obj1 === obj2;
  if (typeof obj1 === "bigint") return obj1 === obj2;
  if (typeof obj1 === "function") return obj1 === obj2;
  if (typeof obj1 === "symbol") return obj1 === obj2;

  // Get the keys of the first object
  const keys = Object.keys(obj1);

  // Check if the number of keys in the first object is the same as the number of keys in the second object
  if (keys.length !== Object.keys(obj2).length) {
    return false;
  }

  // Check if each key in the first object exists in the second object and has the same value
  for (const key of keys) {
    if (!(key in obj2) || !areObjectsEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  // All keys in the first object exist in the second object with the same values
  return true;
}
