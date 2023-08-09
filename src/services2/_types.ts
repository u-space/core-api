/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export class DataBaseError {
  message: string;
  error?: Error;

  constructor(message: string, error?: Error) {
    this.message = message;
    this.error = error;
  }
}

export class InvalidDataError {
  message: string;
  error?: Error;

  constructor(message: string, error?: Error) {
    this.message = message;
    this.error = error;
  }
}

export class NotFoundError {
  message: string;
  error?: Error;

  constructor(message: string, error?: Error) {
    this.message = message;
    this.error = error;
  }
}
