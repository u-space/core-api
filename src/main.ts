/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import App from "./app";
export let app: App;
process.env.TZ = 'America/Montevideo';

process.on("uncaughtException", function (exception) {
  console.log(exception);
});
app = new App();
app.listen();

export async function initAsync() {
  return new Promise((resolve) => {
    if (app == undefined) {
      console.log("><>< initAsync ><><");
      app = new App();
    } else {
      resolve(app);
    }
  });
}
