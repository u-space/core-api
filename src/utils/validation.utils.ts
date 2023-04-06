/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Return true if length is between 1 255
 * @param text text to validate
 */
export function genericTextLenghtValidation(text: string) {
  return notUndefined(text) && text.length > 1 && text.length < 256;
}

/**
 * Return true if text not undefined or null
 */
export function notUndefined(text: string): boolean {
  return text !== undefined && text !== null;
}

export function validateStringDateIso(strDateIso: string) {
  const isoDateRegex =
    /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)?([+-][0-2]\d:[0-5]\d|Z)$/;
  const strValid = isoDateRegex.test(strDateIso);
  return strValid;
}

export const dateTimeStringFormat = "yyyy-mm-ddThh:mm:ss.mmmZ";

export function validateNumber(
  numberToValidate: unknown,
  min: number,
  max: number
): boolean {
  const number = Number(numberToValidate);
  if (Number.isNaN(number)) {
    return false;
  } else if (number < min || number > max) {
    return false;
  }
  return true;
}

export interface ObjectKey {
  name: string;
  type: ObjectKeyType;
}

export enum ObjectKeyType {
  STRING,
  OBJECT,
  BOOLEAN,
  NUMBER,
  OTHER,
}

function getObjectKeyType(obj: any, keyName: string): ObjectKeyType {
  if (typeof obj[keyName] === "string") {
    return ObjectKeyType.STRING;
  } else if (typeof obj[keyName] === "object") {
    return ObjectKeyType.OBJECT;
  } else if (typeof obj[keyName] === "boolean") {
    return ObjectKeyType.BOOLEAN;
  } else if (typeof obj[keyName] === "number") {
    return ObjectKeyType.NUMBER;
  }
  return ObjectKeyType.OTHER;
}

export function validateObjectKeys(
  obj: any,
  mandatoryKeys: ObjectKey[],
  optionalKeys: ObjectKey[]
): void {
  const objKeys: string[] = Object.keys(obj);
  // we verify all mandatory keys are in the obj
  for (let i = 0; i < mandatoryKeys.length; i++) {
    const key = mandatoryKeys[i];
    if (!objKeys.includes(key.name))
      throw new Error(`'${key.name}' key is missing in the object`);
    // verify type is correct
    if (getObjectKeyType(obj, key.name) !== key.type) {
      throw new Error(`'${key.name}' must be ${ObjectKeyType[key.type]}`);
    }
  }

  // we verify all obj keys are in mandatoryKeys or optionalKeys
  const allKeys = [...mandatoryKeys, ...optionalKeys];
  for (let i = 0; i < objKeys.length; i++) {
    const objKey = objKeys[i];
    const vec = allKeys.filter((key) => key.name === objKey);
    if (vec.length === 0) {
      throw new Error(`'${objKeys[i]}' key does not belong to the object`);
    }
    const key = vec[0];
    if (getObjectKeyType(obj, objKey) !== key.type) {
      throw new Error(`'${key.name}' must be ${ObjectKeyType[key.type]}`);
    }
  }
}

export function validateString(obj: unknown): boolean {
  return typeof obj === "string" || obj instanceof String;
}

export function validateArray(obj: unknown): boolean {
  return obj instanceof Array;
}

export function validateStringArray(obj: any): boolean {
  if (!validateArray(obj)) return false;
  for (let i = 0; i < obj.length; i++) {
    if (!validateString(obj[i])) return false;
  }
  return true;
}
