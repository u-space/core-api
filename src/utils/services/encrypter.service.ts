/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as bcrypt from "bcryptjs";

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 8);
}

export function checkIfUnencryptedPasswordIsValid(
  unencryptedPassword: string,
  encriptedPassword: string
) {
  // console.log(`checkIfUnencryptedPasswordIsValid(unencryptedPassword: ${unencryptedPassword}, encriptedPassword: ${encriptedPassword}) {`)
  return bcrypt.compareSync(unencryptedPassword, encriptedPassword);
}
