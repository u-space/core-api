/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable @typescript-eslint/no-empty-function */
import { IUserControllerExtension } from "./extensions-interfaces";

class DefaultUserControllerExtension implements IUserControllerExtension {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  postProcessRegisterUser(_user: unknown, _origin: unknown): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  postProcessAddDocument(_user: string, _document: unknown) {}
}

module.exports = DefaultUserControllerExtension;
