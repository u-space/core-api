/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { DataBaseError, InvalidDataError, NotFoundError } from "./db-errors";
import { ILike } from "typeorm";
import { TypeOrmErrorType } from "./type-orm-error-type";
import { VehicleDao } from "./vehicle.dao";
import { UserDao } from "./user.dao";
import { GeoPoint } from "../entities/geo-point";
import { Point } from "geojson";
import { Geo3DPoint } from "../entities/geo3d-point";
import { VertiportEntity } from "./entities/vertiport.entity";
import { Vertiport } from "../entities/vertiport";

export const validatePaginationParams = (
  take?: number,
  skip?: number,
  filterProp?: string,
  filterValue?: string,
  orderProp?: string,
  orderValue?: string
) => {
  if (take !== undefined && take < 1) {
    //TODO: || take > 200 deleted for now
    throw new InvalidDataError(
      `The take param must be a number between 1 and 200 (take=${take})`,
      null
    );
  } else if (skip !== undefined && skip < 0) {
    throw new InvalidDataError(
      `The skip param must be a natural number (skip=${skip})`,
      null
    );
  } else if (filterProp && !filterValue) {
    throw new InvalidDataError(
      "If you pass the filterProp param, you also have to pass the filterValue param",
      null
    );
  } else if (!filterProp && filterValue) {
    throw new InvalidDataError(
      "If you pass the filterValue param, you also have to pass the filterProp param",
      null
    );
  } else if (filterProp && filterValue) {
    if (filterProp.length < 1 || filterProp.length > 255) {
      throw new InvalidDataError(
        "The length of the filterProp param must be between 1 and 255 characters",
        null
      );
    } else if (filterValue.length < 1 || filterValue.length > 255) {
      throw new InvalidDataError(
        "The length of the filterValue param must be between 1 and 255 characters",
        null
      );
    }
  }

  if (orderProp && !orderValue) {
    throw new InvalidDataError(
      "If you pass the orderProp param, you also have to pass the orderValue param",
      null
    );
  } else if (!orderProp && orderValue) {
    throw new InvalidDataError(
      "If you pass the orderValue param, you also have to pass the orderProp param",
      null
    );
  } else if (orderProp && orderValue) {
    if (orderProp.length < 1 || orderProp.length > 255) {
      throw new InvalidDataError(
        "The length of the orderProp param must be between 1 and 255 characters",
        null
      );
    } else if (orderValue !== "ASC" && orderValue !== "DESC") {
      throw new InvalidDataError(
        `The orderValue param must be "ASC" or "DESC" (orderValue=${orderValue})`,
        null
      );
    }
  }
};

export const validatePaginationParams2 = (
  take: number,
  skip: number,
  filterProp?: string,
  filterValue?: string,
  orderProp?: string,
  orderValue?: string,
  validFilteringColumns?: any,
  validOrderingColumns?: any
) => {
  validatePaginationParams(
    take,
    skip,
    filterProp,
    filterValue,
    orderProp,
    orderValue
  );
  if (
    filterProp &&
    filterValue &&
    !validFilteringColumns.includes(filterProp)
  ) {
    throw new InvalidDataError(
      `You can not filter by the column '${filterProp}'`,
      null
    );
  }
  if (orderProp && orderValue && !validOrderingColumns.includes(orderProp)) {
    throw new InvalidDataError(
      `You can not order by the column '${orderProp}'`,
      null
    );
  }
};

export type Query = {
  take?: number;
  skip?: number;
  orderBy?: string;
  order?: "DESC" | "ASC";
  filterBy?: string;
  filter?: string;
};

export const addPaginationParamsToQuery = (
  query: any,
  take: any,
  skip: any,
  filterBy: any,
  filter: any,
  orderBy: any,
  order: any,
  alias?: any
) => {
  if (take) query.take(take);
  if (skip) query.skip(skip);
  if (orderBy) {
    if (order === "DESC") {
      query.orderBy(alias ? alias + "." + orderBy : orderBy, "DESC");
    } else {
      query.orderBy(alias ? alias + "." + orderBy : orderBy, "ASC");
    }
  }
  if (filterBy && filter) {
    if (filterBy === "uvin" || filterBy === "id") {
      query
        .andWhere(
          `${alias ? alias + "." + filterBy : filterBy}::VARCHAR ILIKE :filter`
        )
        .setParameters({ filter: `%${filter}%` });
    } else {
      query
        .andWhere(`${alias ? alias + "." + filterBy : filterBy} ILIKE :filter`)
        .setParameters({ filter: `%${filter}%` });
    }
  }
};

export const createFilter = (
  idName: string,
  orderProp?: string,
  orderValue?: string,
  take?: number,
  skip?: number,
  filterProp?: string,
  filterValue?: string
) => {
  const filter: any = {};
  filter.where = {};
  if (filterProp && filterValue) {
    if (filterProp === idName) {
      filter.where = `${idName}::VARCHAR ilike '${filterValue}'`;
    } else {
      filter.where[filterProp] = ILike("%" + filterValue + "%");
    }
  }
  if (orderProp && orderValue) {
    filter.order = {};
    filter.order[orderProp] = orderValue;
  }
  filter.take = take || 10;
  filter.skip = skip || 0;

  return filter;
};

export const errorMeansThatTheFilterPropColumnIsNotText = (
  error: any
): boolean => {
  return (
    (error.name === TypeOrmErrorType.QueryFailedError &&
      error.message.startsWith(
        "operator does not exist: numeric ~~ unknown"
      )) ||
    error.message.startsWith("parse error - invalid geometry") ||
    error.message.startsWith(
      "operator does not exist: timestamp without time zone ~~ unknown"
    )
  );
};

export const checkStringLength = (
  str: string,
  strName: string,
  minLength: number,
  maxLength: number
) => {
  if (str.length < minLength || str.length > maxLength) {
    throw new InvalidDataError(
      `${strName} must have between ${minLength} and ${maxLength} characters (${strName}=${str})`,
      null
    );
  }
};

export const checkStringLengthAndNotNull = (
  str: string,
  strName: string,
  minLength: number,
  maxLength: number
) => {
  if (!str) {
    throw new InvalidDataError(
      `${strName} can not be null, undefined or empty`,
      null
    );
  }
  checkStringLength(str, strName, minLength, maxLength);
};

export const getUserAndIfItDoesntExistThrowInvalidDataError = async (
  username: string
) => {
  try {
    return await new UserDao().one(username);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new InvalidDataError(
        `There is no user with the username received (username=${username})`,
        error
      );
    } else {
      throw error;
    }
  }
};

export const getVehicleAndIfItDoesntExistThrowInvalidDataError = async (
  uvin: string
) => {
  try {
    return await new VehicleDao().one(uvin);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new InvalidDataError(
        `There is no vehicle with the uvin received (uvin=${uvin})`,
        error
      );
    } else {
      throw error;
    }
  }
};

export const convertFromGeoPointToPoint = (geoPoint: GeoPoint): any => {
  if (geoPoint === null) return null;
  return {
    type: "Point",
    coordinates: [geoPoint.getLongitude(), geoPoint.getLatitude()],
  };
};

export const convertFromGeo3DPointToPoint = (geo3DPoint: Geo3DPoint): any => {
  if (geo3DPoint === null) return null;
  return {
    type: "Point",
    coordinates: [
      geo3DPoint.getLongitude(),
      geo3DPoint.getLatitude(),
      geo3DPoint.getAltitude(),
    ],
  };
};

export const convertToGeoPoint = (point: Point): any => {
  if (point === null) return null;
  return new GeoPoint(point.coordinates[0], point.coordinates[1]);
};

export const convertToGeo3DPoint = (point: Point): any => {
  if (point === null) return null;
  return new Geo3DPoint(
    point.coordinates[0],
    point.coordinates[1],
    point.coordinates[2]
  );
};

export const convertToVertiport = (
  vertiportEntity: VertiportEntity
): Vertiport => {
  return new Vertiport(
    vertiportEntity.id,
    vertiportEntity.name,
    convertToGeoPoint(vertiportEntity.point),
    vertiportEntity.buffer,
    parseClosedHours(vertiportEntity.closedHours),
    vertiportEntity.timeBetweenFlights
  );
};

export const convertToVertiportEntity = (
  vertiport: Vertiport
): VertiportEntity => {
  return new VertiportEntity(
    vertiport.getId(),
    vertiport.getName(),
    convertFromGeoPointToPoint(vertiport.getPoint()),
    vertiport.getBuffer(),
    concatClosedHours(vertiport.getClosedHours()),
    vertiport.getTimeBetweenFlights()
  );
};

export const handleTypeORMError = (
  error: any,
  entityName: any,
  filterBy: any,
  orderBy: any
) => {
  if (errorMeansThatTheFilterPropColumnIsNotText(error)) {
    throw new InvalidDataError(
      `You only can filter by columns of type text (filterBy=${filterBy})`,
      error
    );
  }
  if (
    error.name === TypeOrmErrorType.EntityColumnNotFound &&
    error.message.startsWith(`No entity column "${filterBy}" was found`)
  ) {
    throw new InvalidDataError(
      `You can not filter by "${filterBy}" because it is not a ${entityName} property`,
      error
    );
  } else if (
    error.message.startsWith(
      `${orderBy} column was not found in the ${entityName} entity`
    )
  ) {
    throw new InvalidDataError(
      `You can not order by "${orderBy}" because it is not a ${entityName} property`,
      error
    );
  } else {
    throw new DataBaseError(
      "There was an error trying to execute the query",
      error
    );
  }
};

const CLOSED_HOURS_DELIMITER = "@@@";

const parseClosedHours = (closedHoursString: string): any => {
  if (closedHoursString === null) return null;
  return closedHoursString.split(CLOSED_HOURS_DELIMITER);
};

const concatClosedHours = (closedHours: string[]): any => {
  if (closedHours === null) return null;
  let result = "";
  for (let i = 0; i < closedHours.length; i++) {
    result += closedHours[i] + CLOSED_HOURS_DELIMITER;
  }
  if (result.endsWith(CLOSED_HOURS_DELIMITER)) {
    result = result.substring(0, result.length - CLOSED_HOURS_DELIMITER.length);
  }
  return result;
};
