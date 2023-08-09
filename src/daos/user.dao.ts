/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  EntityColumnNotFound,
  getManager,
  getRepository,
  ILike,
  QueryFailedError,
} from "typeorm";
import { isArray, isNullOrUndefined, isObject, isString } from "util";
import { Document } from "../entities/document";
import { OperationState } from "../entities/operation";
import { roleValueOf, User } from "../entities/user";
import { VehicleAuthorizeStatus, VehicleReg } from "../entities/vehicle-reg";
import {
  CorruptedDataBaseError,
  DataBaseError,
  InvalidDataError,
  NotFoundError,
} from "./db-errors";
import { DocumentDao } from "./document.dao";
import { OperationDao } from "./operation.dao";
import { TypeOrmErrorType } from "./type-orm-error-type";
import GeneralUtils from "./utils/general.utils";
import { VehicleDao } from "./vehicle.dao";

export class UserDao {
  private userRepository = getRepository(User);

  async all(
    status?: string,
    orderProp?: string,
    orderValue?: string,
    take?: number,
    skip?: number,
    filterProp?: string,
    filterValue?: string,
    deleted?: boolean
  ): Promise<{ users: User[]; count: number }> {
    const filter: any = {};
    filter.where = {};
    if (filterProp && filterValue) {
      // role is a enum, so we have to manually handle this case
      if (filterProp === "role") {
        if (isNullOrUndefined(roleValueOf(filterValue))) {
          throw new InvalidDataError(
            `If filterProp is role, filterValue must be a valid role (filterValue=${filterValue})`,
            undefined
          );
        }
        filter.where.role = roleValueOf(filterValue);
      } else {
        filter.where[filterProp] = ILike("%" + filterValue + "%");
      }
    }
    if (orderProp && orderValue) {
      filter.order = {};
      filter.order[orderProp] = orderValue;
    }
    if (deleted) {
      filter.withDeleted = true;
    }
    filter.take = status ? 10000 : take || 10; // Do not paginate if we want to filter by status, otherwise the count is going to be reaaally off
    filter.skip = status ? 0 : skip || 0;
    let dbResult: [User[], number];
    try {
      dbResult = await this.userRepository.findAndCount(filter);
    } catch (error: any) {
      if (error instanceof EntityColumnNotFound) {
        throw new InvalidDataError(
          `filterProp is not valid (filterProp=${filterProp})`,
          error
        );
      } else if (error instanceof QueryFailedError) {
        if (
          (error as QueryFailedError).message.startsWith(
            "operator does not exist"
          )
        ) {
          throw new InvalidDataError(
            `filterProp is not valid (filterProp=${filterProp})`,
            error
          );
        }
      }
      throw new DataBaseError(
        "Error trying to get the users from the db",
        error
      );
    }
    const [coreUsers, count] = dbResult;
    //* Lets map each user to their corresponding extra fields
    const users = [];
    for (let i = 0; i < coreUsers.length; i++) {
      const user = coreUsers[i];
      user.extra_fields = user.extra_fields_json;
      await this.setUserDocuments(user);
      users.push(user);
    }
    return Promise.resolve({ users, count });
  }

  async one(username: string): Promise<User> {
    let user: User;
    try {
      user = await this.userRepository.findOneOrFail(username);
    } catch (error: any) {
      if (error.name === TypeOrmErrorType.EntityNotFound) {
        throw new NotFoundError(
          `There is no user with the username received (username=${username})`,
          error
        );
      } else {
        throw new DataBaseError(
          `There was an error trying to execute UserDao.one("${username}")`,
          error
        );
      }
    }
    user.extra_fields = user.extra_fields_json;
    if (
      isObject(user.extra_fields) &&
      Object.keys(user.extra_fields).includes("documents")
    ) {
      await this.setUserDocuments(user);
    }
    delete user.extra_fields_json;
    return user;
  }

  async save(user: User) {
    if (
      user.extra_fields !== null &&
      user.extra_fields !== undefined &&
      user.extra_fields !== ""
    ) {
      // before serialize the extra fields, we have to remove the documents and keep only the ids
      GeneralUtils.removeDocumentsAndKeepIds(user.extra_fields);
    }
    if (user.settings === null || user.settings === undefined)
      user.settings = "EN";
    user.extra_fields_json = user.extra_fields;
    const u = await this.userRepository.save(user);
    u.extra_fields = u.extra_fields_json;
    GeneralUtils.setDocumentsDownloadFileUrl(u);
    return u;
  }

  async update(user: User) {
    try {
      if (user.extra_fields) {
        if (!user.extra_fields.documents) {
          // if user received does not contain the documents, we keep the documents the user has right now
          const dbUser = await this.one(user.username);
          user.extra_fields.documents = dbUser.extra_fields.documents;
        }
        // before serialize the extra fields, we have to remove the documents and keep only the ids
        GeneralUtils.removeDocumentsAndKeepIds(user.extra_fields);
        user.extra_fields_json = user.extra_fields;
      }
      const u = await this.userRepository.save(user);
      u.extra_fields = u.extra_fields_json;
      return u;
    } catch (error: any) {
      throw new Error(`An error has ocurred: ${error}`);
    }
  }

  async updatePassword(username: string, password: string) {
    try {
      const manager = getManager();
      await manager.query(
        'UPDATE "user" SET password = $1 WHERE username = $2',
        [password, username]
      );
    } catch (error: any) {
      throw new Error(`An error has ocurred: ${error}`);
    }
  }

  async disable(username: string) {
    if (username) {
      try {
        // we have to unauthorize all user vehicles
        // and close all user operations
        await this.userRepository.findOneOrFail(username);
        const vehicleDao = new VehicleDao();
        const operationDao = new OperationDao();

        // unauthorize all user vehicles
        const userVehicles = await vehicleDao.allByUser(username);
        userVehicles.forEach((vehicle) => {
          const updatedVehicle: VehicleReg = new VehicleReg();
          updatedVehicle.uvin = vehicle.uvin;
          updatedVehicle.authorized = VehicleAuthorizeStatus.NOT_AUTHORIZED;
          vehicleDao.updateOnlyReceivedProperties(updatedVehicle);
        });

        //Close all users operations
        const userOperations = await operationDao.operationsByOwner(username);
        userOperations.forEach((operation) => {
          operationDao.updateState(
            operation.gufi,
            OperationState.CLOSED,
            operation.state,
            "disabling user"
          );
        });

        //after all vehicles went unauthorized and all operations are closed proceed to soft delete user
        return await this.userRepository.softDelete(username);
      } catch (error: any) {
        if (error.name === TypeOrmErrorType.EntityNotFound) {
          throw new NotFoundError(
            `There is no user with the username received (username=${username})`,
            error
          );
        }
        throw new Error(`An error has ocurred: ${error}`);
      }
    } else {
      throw "Invalid username";
    }
  }

  async enable(username: string) {
    return await this.userRepository.restore(username);
  }

  async exists(username: string) {
    try {
      await this.userRepository.findOneOrFail(username);
      return true;
    } catch (error: any) {
      if (error.name === TypeOrmErrorType.EntityNotFound) {
        return false;
      } else {
        throw new DataBaseError(
          `There was an error trying to execute exits(${username})`,
          error
        );
      }
    }
  }

  async existsMail(mail: string) {
    try {
      await this.userRepository.findOneOrFail({ email: mail });
      return true;
    } catch (error: any) {
      if (error.name === TypeOrmErrorType.EntityNotFound) {
        return false;
      } else {
        throw new DataBaseError(
          `There was an error trying to execute mailExists(${mail})`,
          error
        );
      }
    }
  }

  // ---------------------------------------------------------------
  // ---------------------- PRIVATE FUNCTIONS ----------------------
  // ---------------------------------------------------------------

  private async setUserDocuments(user: User): Promise<void> {
    if (
      !isObject(user.extra_fields) ||
      !isArray(user.extra_fields["documents"])
    )
      return;
    const documentIds: Array<any> = user.extra_fields["documents"];
    const documents: Document[] = [];
    for (let i = 0; i < documentIds.length; i++) {
      const documentId = documentIds[i];
      if (!isString(documentId)) {
        throw new CorruptedDataBaseError(
          `In user extra fields, documents must be an array of strings (username=${user.username})`
        );
      }
      let document: Document;
      try {
        document = await new DocumentDao().one(documentId);
      } catch (error: any) {
        if (error instanceof NotFoundError) {
          throw new CorruptedDataBaseError(
            `The user has a document that does not exist (username=${user.username}, documentId=${documentId})`,
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
    user.extra_fields["documents"] = documents;
    GeneralUtils.setDocumentsDownloadFileUrl(user);
  }
}
