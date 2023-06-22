import winston from "winston";

class Logger {
  private winstonLogger: winston.Logger;

  constructor() {
    this.winstonLogger = winston.createLogger({
      level: "info",
      format: winston.format.json(),
      transports: [
        new winston.transports.File({
          filename: `logs/mqtt-log`,
          maxsize: 1024 * 1024 * 5,
          maxFiles: 5,
        }),
      ],
    });
  }

  tryToLog(message: string): void {
    try {
      this.winstonLogger.log("info", message, [
        `timestamp: ${new Date().getTime()}`,
      ]);
    } catch (error) {
      /* empty */
    }
  }
}

const logger = new Logger();

export default logger;
