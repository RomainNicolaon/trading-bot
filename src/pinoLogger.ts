import pino from "pino";

class pinoLoggerUtil {
  private PinoLogger: pino.Logger;

  constructor() {
    this.PinoLogger = pino({
      level: "debug",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
        },
      },
    });
  }

  debug(msg: string, ...args: any[]): void {
    this.PinoLogger.debug(msg, ...args);
    this.PinoLogger.flush();
  }

  info(msg: string, ...args: any[]): void {
    this.PinoLogger.info(msg, ...args);
    this.PinoLogger.flush();
  }

  warn(msg: string, ...args: any[]): void {
    this.PinoLogger.warn(msg, ...args);
    this.PinoLogger.flush();
  }

  error(msg: string, ...args: any[]): void {
    this.PinoLogger.error(msg, ...args);
    this.PinoLogger.flush();
  }

  fatal(msg: string, ...args: any[]): void {
    this.PinoLogger.fatal(msg, ...args);
    this.PinoLogger.flush();
  }
}

export default new pinoLoggerUtil();
