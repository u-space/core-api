/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRepository } from "typeorm";
import { VehicleReg } from "../entities/vehicle-reg";
import { Role, User } from "../entities/user";
import { TypeOrmErrorType } from "./type-orm-error-type";
import { UserDao } from "./user.dao";
import {
  CorruptedDataBaseError,
  DataBaseError,
  InvalidDataError,
  NotFoundError,
} from "./db-errors";
import {
  addPaginationParamsToQuery,
  checkStringLength,
  checkStringLengthAndNotNull,
  getUserAndIfItDoesntExistThrowInvalidDataError,
  handleTypeORMError,
  validatePaginationParams,
} from "./utils";
import GeneralUtils from "./utils/general.utils";
import { isArray, isObject, isString } from "util";
import { DocumentDao } from "./document.dao";
import { Document } from "../entities/document";

export class VehicleDao {
  private repository = getRepository(VehicleReg);

  async all(
    orderProp?: string,
    orderValue?: string,
    take?: number,
    skip?: number,
    filterProp?: string,
    filterValue?: string
  ): Promise<any> {
    validatePaginationParams(
      take,
      skip,
      filterProp,
      filterValue,
      orderProp,
      orderValue
    );
    try {
      const qb = this.repository
        .createQueryBuilder("vehicle_reg")
        .leftJoinAndSelect("vehicle_reg.owner", "owner")
        .leftJoinAndSelect("vehicle_reg.registeredBy", "registeredBy")
        .leftJoinAndSelect("vehicle_reg.operators", "operator")
        .orderBy("vehicle_reg.date", "DESC");
      addPaginationParamsToQuery(
        qb,
        take,
        skip,
        filterProp,
        filterValue,
        orderProp,
        orderValue,
        "vehicle_reg"
      );
      const [vehicles, count] = await qb.getManyAndCount();
      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        vehicle.extra_fields = vehicle.extra_fields_json;
        await this.setVehicleDocuments(vehicle);
      }
      return { vehicles, count };
    } catch (error) {
      handleTypeORMError(error, "vehicle", filterProp, orderProp);
    }
  }

  async allByUser(username: any) {
    try {
      if (!(await new UserDao().exists(username))) {
        throw new NotFoundError(
          `There is no user with the username received (username="${username}")`,
          undefined
        );
      }
      const allVehicles = await this.repository
        .createQueryBuilder("vehicle_reg")
        .leftJoinAndSelect("vehicle_reg.owner", "owner")
        .leftJoinAndSelect("vehicle_reg.registeredBy", "registeredBy")
        .leftJoinAndSelect("vehicle_reg.operators", "operator")
        .where('vehicle_reg."ownerUsername" = :username')
        .setParameters({
          username: username,
        })
        .getMany();
      for (let i = 0; i < allVehicles.length; i++) {
        const vehicle = allVehicles[i];
        vehicle.extra_fields = vehicle.extra_fields_json;
        await this.setVehicleDocuments(vehicle);
      }
      return allVehicles;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      } else {
        throw new DataBaseError(
          `There was an error trying to execute allByUser(${username})`,
          error
        );
      }
    }
  }

  async vehiclesByOperator(
    username: any,
    pageTake = 10,
    pageSkip = 0,
    filterProp?: string,
    filterValue?: string
  ): Promise<{ vehicles: VehicleReg[]; count: number }> {
    validatePaginationParams(pageTake, pageSkip, filterProp, filterValue);

    // we verify that the user exists
    if (!(await new UserDao().exists(username))) {
      throw new NotFoundError(
        `There is no user with the username received (username=${username})`,
        undefined
      );
    }

    // fetch all the vehicles from the db
    try {
      const qb = await this.repository
        .createQueryBuilder("vehicle_reg")
        .leftJoinAndSelect("vehicle_reg.owner", "owner")
        .leftJoinAndSelect("vehicle_reg.registeredBy", "registeredBy")
        .innerJoinAndSelect("vehicle_reg.operators", "operator")
        .where('operator."username" = :username')
        .setParameters({
          username: username,
        });
      addPaginationParamsToQuery(
        qb,
        pageTake,
        pageSkip,
        filterProp,
        filterValue,
        null,
        null,
        "vehicle_reg"
      );
      const [vehicles, count] = await qb.getManyAndCount();
      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        vehicle.extra_fields = vehicle.extra_fields_json;
        await this.setVehicleDocuments(vehicle);
      }
      // let matchedVehicles = allVehicles;
      // // TODO:
      // // We are doing the filtering and the pagination on memory, and this is not performant.
      // // We should do the filtering and the pagination in the database query
      // if (filterProp && filterValue) {
      // 	matchedVehicles = filter(allVehicles, (vehicle) => {
      // 		return (
      // 			vehicle[filterProp] !== null &&
      // 			vehicle[filterProp] !== undefined &&
      // 			vehicle[filterProp].indexOf(filterValue) > -1
      // 		);
      // 	});
      // }
      // const filteredVehicles = take(drop(matchedVehicles, pageSkip), pageTake);
      return { vehicles, count };
    } catch (error: any) {
      throw new DataBaseError(
        `There was an error trying to execute vehiclesByOperator(${username}, ${pageTake}, ${pageSkip}, ${filterProp}, ${filterValue})`,
        error
      );
    }
  }

  async one(uvin: string) {
    let result: VehicleReg;
    try {
      result = await this.repository.findOneOrFail(uvin);
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no vehicle with the "uvin" received (uvin=${uvin})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute one(${uvin})`,
          error
        );
      }
    }
    result.extra_fields = result.extra_fields_json;
    if (
      isObject(result.extra_fields) &&
      Object.keys(result.extra_fields).includes("documents")
    ) {
      await this.setVehicleDocuments(result);
    }
    return result;
  }

  async oneByUser(uvin: string, username: string) {
    try {
      const v = await this.repository.findOneOrFail(uvin, {
        where: {
          owner: username,
        },
      });
      v.extra_fields = v.extra_fields_json;
      await this.setVehicleDocuments(v);
      return v;
    } catch (error: any) {
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no vehicle with the "uvin" received (uvin=${uvin})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute oneByUser(${uvin}, ${username})`,
          error
        );
      }
    }
  }

  async add(vehicle: VehicleReg, registeredByUsername: string) {
    const registeredByUser: User = new User("", "", "", "", Role.PILOT);
    registeredByUser.username = registeredByUsername;
    const vehicleToAdd: VehicleReg = {
      registeredBy: registeredByUser,
      ...vehicle,
    };
    this.normalizeVehicleData(vehicleToAdd);
    this.validateVehicleToAdd(vehicleToAdd);

    // validates registeredBy, owner and operators
    await getUserAndIfItDoesntExistThrowInvalidDataError(
      vehicleToAdd.registeredBy!.username
    );
    await getUserAndIfItDoesntExistThrowInvalidDataError(
      vehicleToAdd.owner!.username
    );
    if (
      vehicleToAdd.operators !== undefined &&
      vehicleToAdd.operators.length > 10
    ) {
      throw new InvalidDataError(
        `You can not add a vehicle with more than 10 operators (operators=${vehicleToAdd.operators.length})`,
        undefined
      );
    }
    if (vehicleToAdd.operators !== undefined) {
      for (let i = 0; i < vehicleToAdd.operators.length; i++) {
        await getUserAndIfItDoesntExistThrowInvalidDataError(
          vehicleToAdd.operators[i].username
        );
      }
    }

    try {
      // TODO We have to check that if trackerId is not null, it belongs to an existing tracker
      vehicleToAdd.extra_fields_json = vehicleToAdd.extra_fields;
      const dbVehicle: VehicleReg = await this.repository.save(vehicleToAdd);
      dbVehicle.extra_fields = dbVehicle.extra_fields_json;
      await this.setVehicleDocuments(dbVehicle);

      return await this.one(dbVehicle.uvin!);
    } catch (error: any) {
      throw new DataBaseError(
        "There was an error trying to execute VehicleDao.add(vehicle)",
        error
      );
    }
  }

  async updateOnlyReceivedProperties(vehicle: VehicleReg) {
    try {
      // console.log(`Editing ${JSON.stringify(vehicle, null, 2)}`);
      // verify that there is a vehicle with the uvin received
      if (!vehicle.uvin) {
        throw new InvalidDataError(
          `You must to pass the uvin of the vehicle you want to update (uvin=${vehicle.uvin})`,
          undefined
        );
      }
      await this.one(vehicle.uvin);

      // update the vehicle
      const vehicleExtraFields = vehicle.extra_fields;
      if (vehicleExtraFields) {
        if (!vehicleExtraFields.documents) {
          // if vehicle received does not contain the documents, we keep the documents the vehicle has right now
          const dbVehicle = await this.one(vehicle.uvin);
          if (dbVehicle.extra_fields && dbVehicle.extra_fields.documents)
            vehicleExtraFields.documents = dbVehicle.extra_fields.documents;
        }
        GeneralUtils.removeDocumentsAndKeepIds(vehicleExtraFields);
        vehicle.extra_fields_json = vehicle.extra_fields;
      }
      await this.repository.save(vehicle);

      // return the vehicle with the updated data
      return this.one(vehicle.uvin);
    } catch (error: any) {
      console.error("error", error);
      if (
        error.name === TypeOrmErrorType.EntityNotFound ||
        (error.name === TypeOrmErrorType.QueryFailedError &&
          error.message.startsWith("invalid input syntax for type uuid"))
      ) {
        throw new NotFoundError(
          `There is no vehicle with the uvin received (uvin=${vehicle.uvin})`,
          error
        );
      } else if (error instanceof InvalidDataError) {
        throw error;
      } else {
        throw new DataBaseError(
          "There was an error trying to execute the function VehicleDao.update(vehicle)",
          error
        );
      }
    }
  }

  async countVehiclesByRegistrationYear(year: any) {
    try {
      const minDate = new Date(`${year}-01-01`);
      const maxDate = new Date(`${year + 1}-01-01`);
      return this.repository
        .createQueryBuilder("vehicle_reg")
        .where('vehicle_reg."date" >= :minDate')
        .andWhere('vehicle_reg."date" < :maxDate')
        .setParameters({
          minDate: minDate,
          maxDate: maxDate,
        })
        .getCount();
    } catch (error: any) {
      throw new DataBaseError(
        `There was an error trying to execute "countVehiclesByRegistrationYear(${year})"`,
        error
      );
    }
  }

  // -------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------
  // ------------------------------ PRIVATE FUNCTIONS ------------------------------
  // -------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------

  private normalizeVehicleData(vehicle: VehicleReg) {
    if (vehicle.vehicleName) vehicle.vehicleName = vehicle.vehicleName.trim();

    // we delete duplicate values from operators list
    if (!vehicle.operators) {
      vehicle.operators = [];
    }
    const operatorUsernames: string[] = [];
    const normalizedOperators: User[] = [];
    for (let i = 0; i < vehicle.operators.length; i++) {
      const operator: User = vehicle.operators[i];
      if (!operatorUsernames.includes(operator.username)) {
        normalizedOperators.push(operator);
        operatorUsernames.push(operator.username);
      }
    }
    vehicle.operators = normalizedOperators;
  }

  private validateVehicleToAdd(vehicle: VehicleReg) {
    checkStringLengthAndNotNull(vehicle.vehicleName, "vehicleName", 1, 100);
    if (!vehicle.class)
      throw new InvalidDataError(
        "class can not be null, undefined or empty",
        undefined
      );
    if (vehicle.date)
      throw new InvalidDataError(
        "date must be null, undefined or empty, because it is setted automatically by the dao",
        undefined
      );
    if (!vehicle.registeredBy || !vehicle.registeredBy.username)
      throw new InvalidDataError(
        "It is mandatory to specify registeredBy parameter",
        undefined
      );
    if (!vehicle.owner || !vehicle.owner.username)
      throw new InvalidDataError(
        "It is mandatory to specify owner parameter",
        undefined
      );
    if (vehicle.nNumber) checkStringLength(vehicle.nNumber, "nNumber", 1, 100);
    if (vehicle.faaNumber)
      checkStringLength(vehicle.faaNumber, "faaNumber", 1, 100);
    if (vehicle.manufacturer)
      checkStringLength(vehicle.manufacturer, "manufacturer", 1, 100);
    if (vehicle.model) checkStringLength(vehicle.model, "model", 1, 100);
    if (vehicle.accessType)
      checkStringLength(vehicle.accessType, "accessType", 1, 100);
    if (vehicle.vehicleTypeId)
      checkStringLength(vehicle.vehicleTypeId, "vehicleTypeId", 1, 100);
    if (vehicle["org-uuid"])
      checkStringLength(vehicle["org-uuid"], "vehicleTypeId", 1, 100);
  }

  private async setVehicleDocuments(vehicle: VehicleReg): Promise<void> {
    if (
      !isObject(vehicle.extra_fields) ||
      !isArray(vehicle.extra_fields["documents"])
    )
      return;
    const documentIds: Array<any> = vehicle.extra_fields["documents"];
    const documents: Document[] = [];
    for (let i = 0; i < documentIds.length; i++) {
      const documentId = documentIds[i];
      if (!isString(documentId)) {
        throw new CorruptedDataBaseError(
          `In vehicle extra fields, documents must be an array of strings (uvin=${vehicle.uvin})`
        );
      }
      let document: Document;
      try {
        document = await new DocumentDao().one(documentId);
      } catch (error: any) {
        if (error instanceof NotFoundError) {
          throw new CorruptedDataBaseError(
            `The vehicle has a document that does not exist (uvin=${vehicle.uvin}, documentId=${documentId})`,
            error as unknown as Error
          );
        }
        throw new DataBaseError(
          `Error trying to get a document (id=${documentId})`,
          error
        );
      }
      documents.push(document);
    }
    vehicle.extra_fields["documents"] = documents;
    GeneralUtils.setDocumentsDownloadFileUrl(vehicle);
  }
}
