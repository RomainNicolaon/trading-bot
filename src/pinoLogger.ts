import pino from "pino";
import type { DashboardServer } from "./dashboard/server.js";

class pinoLoggerUtil {
  private PinoLogger: pino.Logger;
  private dashboardServer: DashboardServer | null = null;

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

  // Set dashboard server for live log streaming
  setDashboard(dashboard: DashboardServer) {
    this.dashboardServer = dashboard;
  }

  private sendToDashboard(level: string, message: string) {
    if (this.dashboardServer) {
      try {
        this.dashboardServer.sendLog(level, message);
      } catch (err) {
        // Silently fail if dashboard is not available
      }
    }
  }

  debug(obj?: any, msg?: string, ...args: any[]): void {
    this.PinoLogger.debug(obj, msg, ...args);
    this.PinoLogger.flush();
    if (msg) this.sendToDashboard("info", msg);
  }

  info(obj?: any, msg?: string, ...args: any[]): void {
    this.PinoLogger.info(obj, msg, ...args);
    this.PinoLogger.flush();
    if (msg) this.sendToDashboard("info", msg);
  }

  warn(obj?: any, msg?: string, ...args: any[]): void {
    this.PinoLogger.warn(obj, msg, ...args);
    this.PinoLogger.flush();
    if (msg) this.sendToDashboard("warn", msg);
  }

  error(obj?: any, msg?: string, ...args: any[]): void {
    this.PinoLogger.error(obj, msg, ...args);
    this.PinoLogger.flush();
    if (msg) this.sendToDashboard("error", msg);
  }

  fatal(obj?: any, msg?: string, ...args: any[]): void {
    this.PinoLogger.fatal(obj, msg, ...args);
    this.PinoLogger.flush();
    if (msg) this.sendToDashboard("error", msg);
  }
}

export default new pinoLoggerUtil();
