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

  debug(obj?: any, msg?: string, ...args: any[]): void {
    this.PinoLogger.debug(obj, msg, ...args);
    this.PinoLogger.flush();
  }

  info(obj?: any, msg?: string, ...args: any[]): void {
    this.PinoLogger.info(obj, msg, ...args);
    this.PinoLogger.flush();
  }

  warn(obj?: any, msg?: string, ...args: any[]): void {
    this.PinoLogger.warn(obj, msg, ...args);
    this.PinoLogger.flush();
  }

  error(obj?: any, msg?: string, ...args: any[]): void {
    this.PinoLogger.error(obj, msg, ...args);
    this.PinoLogger.flush();
  }

  fatal(obj?: any, msg?: string, ...args: any[]): void {
    this.PinoLogger.fatal(obj, msg, ...args);
    this.PinoLogger.flush();
  }
}

export default new pinoLoggerUtil();
