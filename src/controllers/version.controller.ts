/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Request, Response } from "express";
import { execSync } from "child_process";

import { logAndRespond200 } from "./utils";
export class VersionController {
  private executeGitCommand(command: any) {
    return execSync(command)
      .toString("utf8")
      .replace(/[\n\r\s]+$/, "");
  }

  async version(request: Request, response: Response) {
    const branch = this.executeGitCommand("git rev-parse --abbrev-ref HEAD");
    const commit = this.executeGitCommand("git log -n 1 HEAD");
    const status = this.executeGitCommand("git status");
    const version = {
      git: {
        HEAD: {
          branch,
          commit,
        },
        status,
      },
    };
    logAndRespond200(response, version, []);
  }
}
