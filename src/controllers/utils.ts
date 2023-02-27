/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Response } from "express";
import { Polygon } from "geojson";
import { logger } from "../utils/logger/main.logger";
import { isUTCDatetime } from "../utils/date.utils";
import { isNullOrUndefined } from "util";

export const logAndRespond = (
  response: Response,
  statusCode: number,
  message: string | null,
  responseBody: unknown,
  logLevel: string,
  error: any,
  keysToHide: any
) => {
  if (message !== null && responseBody !== null) {
    throw `Message and responseBody can't both be filled [message=${message}, responseBody=${responseBody}]`;
  }
  let responseBodyToLog = {
    ...(responseBody as Record<string, unknown>),
  };
  if (message !== null) {
    responseBodyToLog = { message };
  }
  if (keysToHide !== null) {
    for (let i = 0; i < keysToHide.length; i++) {
      if (typeof responseBodyToLog[keysToHide[i]] !== "undefined") {
        responseBodyToLog[keysToHide[i]] = "__HIDDEN__";
      }
    }
  }
  if (logLevel === "info") {
    logger.info(`Request responded [HTTP ${statusCode}]`, {
      response: responseBodyToLog,
    });
  } else if (logLevel === "warn") {
    logger.warn(`Request responded [HTTP ${statusCode}]`, {
      response: responseBodyToLog,
    });
  } else if (logLevel === "error") {
    logger.error(error.message, { response: responseBodyToLog });
    console.log(error);
  }

  if (message !== null) {
    response.status(statusCode).json({ message });
  } else if (responseBody !== null) {
    response.status(statusCode).json(responseBody);
  } else {
    response.status(statusCode).send();
  }
};

export const logAndRespond200 = (
  response: any,
  responseBody: any,
  keysToHide: any,
  statusCode = 200
) => {
  logAndRespond(
    response,
    statusCode,
    null,
    responseBody,
    "info",
    null,
    keysToHide
  );
};

export const logAndRespond400 = (
  response: any,
  statusCode: number,
  message: string | null
) => {
  if (statusCode < 400 || statusCode >= 500) {
    logger.error("The error must be 4xx");
  }
  logAndRespond(response, statusCode, message, null, "info", null, []);
};

export const logAndRespond500 = (
  response: any,
  statusCode: number,
  error: any,
  sendErrorToTheClient?: boolean
) => {
  if (statusCode < 500 || statusCode >= 600) {
    logger.error("The error must be 5xx");
  }
  let message = "Internal server error";
  if (sendErrorToTheClient) message += ` (${(error as Error).message})`;
  logAndRespond(response, statusCode, message, null, "error", error, []);
};

export const logStateChange = (
  gufi: any,
  newState: any,
  oldState: any,
  message: any
) => {
  console.log(`STATE_CHANGE: ${gufi} ${oldState} -> ${newState} [${message}]`);
  logger.info(`STATE_CHANGE: ${gufi} ${oldState} -> ${newState} [${message}]`);
};

export const getErrorMessageFromExpressValidatorErrors = (errors: any) => {
  try {
    const errorsArray = errors.array({ onlyFirstError: true });
    let result = "";
    for (let i = 0; i < errorsArray.length; i++) {
      result += `${errorsArray[i].msg} (${errorsArray[i].param})`;
      if (i !== errorsArray.length - 1) result += ", ";
    }
    return result;
  } catch (err) {
    return null;
  }
};

export class CustomError {
  message: string;
  error: Error | null;

  constructor(message: string, error: Error | null) {
    this.message = message;
    this.error = error;
  }
}

export const getPaginationParametersFromRequestQuery = (
  requestQuery: any
): {
  take?: number;
  skip?: number;
  filterBy?: string;
  filter?: string;
  orderBy?: string;
  order?: "ASC" | "DESC";
  polygon?: Polygon;
} => {
  const { take, skip, filterBy, filter, orderBy, order, polygon } =
    requestQuery;
  let takeNumber = 100;
  let geojsonPolygon: any = undefined;
  if (polygon) {
    const polygonArray = JSON.parse(polygon);
    if (polygonArray.constructor.name !== "Array") {
      throw new CustomError("The polygon must be an array", null);
    }
    if (polygonArray.length < 3) {
      throw new CustomError("The polygon must have at least 3 points", null);
    }
    for (let i = 0; i < polygonArray.length; i++) {
      if (polygonArray[i].length !== 2) {
        throw new CustomError("Each coordinate must have 2 values", null);
      }
    }
    geojsonPolygon = {
      type: "Polygon",
      coordinates: [polygonArray],
    };
  }
  if (!isNullOrUndefined(take)) {
    takeNumber = Number(take);
  }
  if (
    Number.isNaN(takeNumber) ||
    takeNumber <= 0 ||
    !Number.isInteger(takeNumber)
  )
    throw new CustomError(
      `The "take" parameter has to be a positive integer (take=${take})`,
      null
    );
  let skipNumber = undefined;
  if (skip) {
    skipNumber = Number(skip);
  }
  if (Number.isNaN(skipNumber))
    throw new CustomError(
      `The "skip" parameter has to be a number (skip=${skip})`,
      null
    );
  return {
    take: takeNumber,
    skip: skipNumber,
    filterBy,
    filter,
    orderBy,
    order,
    polygon: geojsonPolygon,
  };
};

export const validateObjectStructure = (object: any, validator: any) => {
  const aKeys = Object.keys(object).sort();
  const bKeys = Object.keys(validator).sort();
  return JSON.stringify(aKeys) === JSON.stringify(bKeys);
};

export const validateOperationVolume = (
  operationVolume: any,
  checkVolumeHasId?: boolean
) => {
  const expectedRequestBodyStructure: any = {
    ordinal: 0,
    near_structure: false,
    beyond_visual_line_of_sight: false,
    effective_time_begin: "",
    effective_time_end: "",
    min_altitude: 0,
    max_altitude: 120,
    operation_geography: {
      type: "Polygon",
      coordinates: [],
    },
  };
  if (checkVolumeHasId) expectedRequestBodyStructure.id = 0;
  if (!validateObjectStructure(operationVolume, expectedRequestBodyStructure)) {
    throw new CustomError(
      `Invalid json received (expected json ${JSON.stringify(
        expectedRequestBodyStructure
      )})`,
      null
    );
  }
  if (
    !validateObjectStructure(
      operationVolume["operation_geography"],
      expectedRequestBodyStructure.operation_geography
    )
  ) {
    throw new CustomError(
      `Invalid json received (expected json ${JSON.stringify(
        expectedRequestBodyStructure
      )})`,
      null
    );
  }
  validateDatetime(
    operationVolume["effective_time_begin"],
    "effective_time_begin"
  );
  validateDatetime(operationVolume["effective_time_end"], "effective_time_end");
  validateNumber(operationVolume["min_altitude"], "min_altitude", 0, 99999);
  validateNumber(operationVolume["max_altitude"], "max_altitude", 0, 99999);
  validateOperationGeography(operationVolume["operation_geography"]);
};

export const removeNullProperties = (obj: any, removeEmptyArrays: boolean) => {
  const result: any = {};
  const keys = Object.keys(obj);
  keys.forEach((key) => {
    if (obj[key] !== null && obj[key] !== undefined) {
      if (removeEmptyArrays) {
        if (!Array.isArray(obj[key]) || obj[key].length > 0) {
          result[key] = obj[key];
        }
      } else {
        result[key] = obj[key];
      }
    }
  });
  return result;
};

// -------------------------------------------------------------------
// ------------------------ PRIVATE FUNCTIONS ------------------------
// -------------------------------------------------------------------

function validateDatetime(datetime: string, datetimeName: string) {
  if (!isUTCDatetime(datetime)) {
    throw new CustomError(
      `The ${datetimeName} is invalid. Expected format is YYYY-MM-DDTHH:MM:SSZ (${datetimeName}=${datetime})`,
      null
    );
  }
}

function validateNumber(
  number: number,
  numberName: string,
  min: number,
  max: number
) {
  const parsedNumber = Number(number);
  if (Number.isNaN(parsedNumber) || parsedNumber < min || parsedNumber > max) {
    throw new CustomError(
      `The ${numberName} is not valid, must be a number between ${min} and ${max} (${numberName}=${number})`,
      null
    );
  }
}

function validateOperationGeography(operationGeography: any) {
  if (operationGeography["type"] !== "Polygon") {
    throw new CustomError(
      `operation_geography.type must be "Polygon" (operation_geography.type=${operationGeography["type"]})`,
      null
    );
  }
  if (operationGeography["coordinates"].constructor.name !== "Array") {
    throw new CustomError(
      "operation_geography.coordinates must be an array",
      null
    );
  }
  if (operationGeography["coordinates"].length !== 1) {
    throw new CustomError(
      `operation_geography.coordinates must have 1 item (items=${operationGeography["coordinates"].length})`,
      null
    );
  }
  if (operationGeography["coordinates"][0].constructor.name !== "Array") {
    throw new CustomError(
      "operation_geography.coordinates[0] must be an array",
      null
    );
  }
  if (operationGeography["coordinates"][0].length < 3) {
    throw new CustomError(
      `operation_geography.coordinates[0] must have at least 3 itmes (items=${operationGeography["coordinates"][0].length})`,
      null
    );
  }
  for (let i = 0; i < operationGeography["coordinates"][0].length; i++) {
    const vertex = operationGeography["coordinates"][0][i];
    validateVertex(vertex);
  }
}

function validateVertex(vertex: any) {
  if (vertex.constructor.name !== "Array") {
    throw new CustomError("Every coordinate must be an array", null);
  }
  if (vertex.length !== 2) {
    throw new CustomError("Every coordinate must have 2 elements", null);
  }
  const longitude = Number(vertex[0]);
  if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new CustomError(`Invalid longitude (longitude=${vertex[0]})`, null);
  }
  const latitude = Number(vertex[1]);
  if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new CustomError(`Invalid latitude (latitude=${vertex[1]})`, null);
  }
}
