/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import "reflect-metadata";
import {
  cert,
  CRONJOB_ENABLED,
  HTTP_PORT,
  INSTANCE,
  key,
  MODULES_CENTRAL,
  MODULES_SURVEILLANCE,
  MODULES_TRACKERS,
  MQTT_ENABLED,
  NODE_ENV,
  PORT,
} from "./utils/config.utils";
import express, { NextFunction, Request, Response } from "express";
import * as path from "path";
import cookieParser from "cookie-parser";

// const path = require('path');
import { Connection } from "typeorm";
import cors from "cors";

import { Server } from "http";
import { Server as HttpsServer, createServer } from "https";
import * as fs from "fs";
import Io from "socket.io";

import { Routes } from "./routes";
import { createTypeormConn } from "./utils/database-config.utils";

import { authMiddleware } from "./middleware/socket-io-auth.middleware";

import { CronService } from "./services/cron.service";

import { logger } from "./utils/logger/main.logger";
import { logAndRespond400 } from "./controllers/utils";
import { MQTT } from "./apis/mqtt/mqtt";

import swaggerUi from "swagger-ui-express";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerDocument = require("../swagger.json");

class App {
  public app: any;
  public port: number;
  public httpPort: number;
  public connection?: Connection; // TypeORM connection to the database
  public connectionName: string;
  public io?: SocketIO.Server;
  public publicIo?: Io.Namespace;
  public enabledModules: Map<string, string>;
  private server?: Server;
  private https?: HttpsServer;

  public initedDB = false;
  public initedRest = false;

  private cronService?: CronService;
  privateIo?: Io.Namespace;

  constructor() {
    this.app = express();

    if (PORT == undefined || INSTANCE == undefined) {
      throw "You must define PORT and INSTANCE on .env file";
    }

    this.port = Number.parseInt(PORT); //|| port;
    this.httpPort = Number.parseInt(HTTP_PORT ? HTTP_PORT : "2999"); //|| port;
    this.connectionName = INSTANCE; //|| connName;
    if (NODE_ENV === "test") {
      this.connectionName = "Test";
    }

    const enabledModules = new Map();
    enabledModules.set("trackers", MODULES_TRACKERS);
    enabledModules.set("central", MODULES_CENTRAL);
    enabledModules.set("surveillance", MODULES_SURVEILLANCE);
    this.enabledModules = enabledModules;
    console.log("enabled modules: ", enabledModules);

    console.log(
      `Constructor-> port:${this.port} connName:${this.connectionName}`
    );

    this.initializeMiddlewares();
    this.initializeModels().then(() => {
      const mqttEnabled: string = MQTT_ENABLED ? MQTT_ENABLED : "false";
      if (mqttEnabled === "true") {
        console.log(`MQTT Enabled (MQTT_ENABLED=${mqttEnabled})`);
        new MQTT();
      } else {
        console.log(`MQTT Disabled (MQTT_ENABLED=${mqttEnabled})`);
      }
    });
  }

  private async initializeModels() {
    console.log(`Connection name #${this.connectionName}#!`);
    const connection: Connection = await createTypeormConn(this.connectionName);
    if (connection === undefined) {
      throw new Error("Error connecting to database");
    } // In case the connection failed, the app stops.

    this.connection = connection; // Store the connection object in the class instance.
    if (CRONJOB_ENABLED !== "false") {
      console.log("CRONJOB ENABLED");
      try {
        this.cronService = new CronService();
      } catch (error) {
        console.error(`Error while starting cronService ${error}`);
      }
    } else {
      console.log("CRONJOB DISABLED");
    }
  }

  // Here we can add all the global middlewares for our application. (Those that will work across every contoller)
  private initializeMiddlewares() {
    this.app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument)
    );
    this.app.use(express.json());
    this.app.use(cookieParser());
    this.app.use(
      cors({
        origin: function (
          _origin: any,
          callback: (arg0: null, arg1: boolean) => any
        ) {
          return callback(null, true);
        },
        exposedHeaders: ["token"],
        credentials: true,
      })
    );

    // log every request
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const reqToLog = {
        body: { ...req.body },
        hostname: req.hostname,
        ip: req.ip,
        method: req.method,
        params: { ...req.params },
        path: req.path,
        protocol: req.protocol,
        query: { ...req.query },
        secure: req.secure,
      };

      // before logging the request, we have to hide sensitive information
      if (typeof reqToLog.body.password !== "undefined") {
        reqToLog.body.password = "__HIDDEN__";
      }
      logger.info("Request received", { request: reqToLog });
      next();
    });

    console.log(
      `Path to save upload files::${path.join(__dirname, "uploads")}`
    );
    this.app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    // this.app.use(morgan('dev'))

    // this.app.use(function (req, res, next) {
    //     console.log(`body: ${JSON.stringify(req.body)}`)
    //     console.log(`query: ${JSON.stringify(req.query)}`)
    //     console.log(`params: ${JSON.stringify(req.params)}`)
    //     next()
    // })
    Routes.forEach((route) => {
      this.app[route.method](
        route.route,
        route.middlewares
          ? route.middlewares
          : (req: Request, res: Response, next: NextFunction) => {
              return next();
            },
        (req: Request, res: Response, next: NextFunction) => {
          // TODO: We have to investigate how can we remove this "any"
          const result = new (route.controller as any)()[route.action](
            req,
            res,
            next
          );
          if (result instanceof Promise) {
            // console.log(result)
            // return result

            result
              .then((result) => {
                // console.log(`name ${result.constructor.name}`)
                if (
                  typeof result !== "undefined" &&
                  result.constructor.name === "Object"
                ) {
                  // return result
                  result !== null && result !== undefined
                    ? res.send(result)
                    : undefined;
                } else if (
                  typeof result !== "undefined" &&
                  result.constructor.name === "Array"
                ) {
                  result !== null && result !== undefined
                    ? res.send(result)
                    : undefined;
                  // return result
                } else {
                  // result !== null && result !== undefined ? res.send(result) : undefined
                  return result;
                }
              })
              .catch((error) => console.error(error));
          } else if (result !== null && result !== undefined) {
            res.json(result);
          }
        }
      );
    });

    // This code is executed if the route is not found
    this.app.use((request: Request, response: Response) => {
      return logAndRespond400(response, 404, "The endpoint does not exist");
    });
  }

  public stop(callback: () => void) {
    // console.log("Close io:")
    // this.io.close(function () {
    console.log("Close server:");

    // this.server.close(function (error) {
    //     console.log("server closed" + error)
    //     callback()
    // })

    this.io?.close();
    this.server?.close();
    delete this.io;
    delete this.server;
    // delete this.app
    callback();

    // })
  }

  // Boots the application
  public listen(callback?: (param?: unknown) => void) {
    const port = this.port;

    this.server = new Server(this.app);

    // this.app.use((req, res, next) => {
    //     console.log(`Entrando por http : ${req.get('host')}`)
    //     // The 'x-forwarded-proto' check is for Heroku
    //     if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    //         return res.redirect('https://' + req.get('host') + req.url);
    //     }
    //     next();
    // })

    this.app.get("/", function (req: Request, res: Response) {
      res.sendFile(__dirname + "/index.html");
    });

    this.app.get("/ops", function (req: Request, res: Response) {
      res.sendFile(__dirname + "/operations.html");
    });

    this.app.get("/logo.png", function (req: Request, res: Response) {
      res.type("png");
      res.sendFile(__dirname + "/platform.png");
    });

    this.https = createServer(
      {
        key: fs.readFileSync(key),
        cert: fs.readFileSync(cert),
        // requestCert: false,
        // rejectUnauthorized: false
      },
      this.app
    );

    this.io = Io(this.https);
    const io = this.io;

    //Need to be authorized to call this socket
    const privateIo = io.of("/private");
    privateIo.use(authMiddleware);
    this.privateIo = privateIo;
    //This one is public
    const publicIo = io.of("/public");
    this.publicIo = publicIo;

    //to start a dev http server
    if (this.httpPort) {
      this.server.listen(this.httpPort, () => {
        logger.info(`HTTP Server is running on port ${this.httpPort}`);
        console.log(
          `Server running on port ${JSON.stringify(this.server?.address())}`
        );
        if (!this.initedRest && callback !== undefined) {
          this.initedRest = true;
          callback();
        }
      });
    }

    this.https.listen(port, () => {
      logger.info(`HTTPS Server is running on port ${port}`);
      console.log(
        `Server running on port ${JSON.stringify(this.https?.address())}`
      );
      if (!this.initedRest && callback !== undefined) {
        console.log("Se inicio");
        this.initedRest = true;
        callback();
      }
    });

    this.io.on("connection", function (socket) {
      socket.handshake.query.token;
    });
  }
  // /**
  //  * PrintStatus
  //  */
  // public printStatus() {
  //     console.log(`initedDB:${this.initedDB} initedRest:${this.initedRest} connection.isConnected:${this.connection ? this.connection.isConnected : ""}`)
  // }
}

export default App;
