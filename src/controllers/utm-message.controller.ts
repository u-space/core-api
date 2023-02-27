/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { UTMMessageDao } from "../daos/utm-message.dao";

import { logAndRespond200, logAndRespond400 } from "./utils";

export class UTMMessageController {
  private dao = new UTMMessageDao();

  /**
   * Get all utmsmg
   * @param request
   * @param response
   * @param next
   */
  async all(request: Request, response: Response) {
    try {
      const list = await this.dao.all();
      return logAndRespond200(response, list, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  /**
   * Get one utm msg associated with id
   * @example /utmmessage/2
   * @param request
   * @param response
   * @param next
   */
  async one(request: Request, response: Response) {
    try {
      const one = await this.dao.one(request.params.id);
      return logAndRespond200(response, one, []);
    } catch (error) {
      return logAndRespond400(response, 404, null);
    }
  }

  /**
   * Save the utm message passed by POST
   * @example {
   *    severity: "INFORMATIONAL",
   *    uss_name: "DronfiesUSS",
   *    time_sent: "2019-12-11T19:59:10Z",
   *    message_type: "OPERATION_CONFORMING",
   *    free_text: "Texto libre"
   * }
   * @param request
   * @param response
   * @param next
   */
  async save(request: Request, response: Response) {
    try {
      const one = await this.dao.save(request.body);
      return logAndRespond200(response, one, []);
    } catch (error) {
      return logAndRespond400(response, 400, null);
    }
  }

  /**
   * @param request
   * @param response
   * @param next
   */
  async remove(request: Request, response: Response) {
    return response.sendStatus(501);
  }
}
