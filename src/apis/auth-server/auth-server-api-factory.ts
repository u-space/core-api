/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import AuthServerAPIImp from "./auth-server-api-imp";
import AuthServerAPIMock from "./auth-server-api-mock";
import IAuthServerAPI from "./iauth-server-api";

export default class AuthServerAPIFactory {
  static getAuthServerAPI(mockAuthServerAPI: boolean): IAuthServerAPI {
    if (mockAuthServerAPI) {
      return new AuthServerAPIMock();
    } else {
      return new AuthServerAPIImp();
    }
  }
}
