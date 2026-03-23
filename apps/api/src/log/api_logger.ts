import { inject, injectable } from "inversify";
import pino, { type Bindings, type Logger as PinoLogger, type LoggerOptions } from "pino";
import { Config } from "../config/schema.ts";

/**
 * Owns the shared pino logger used by API startup, Fastify, and background workers so every
 * process-level log line flows through the same formatting and transport configuration.
 */
@injectable()
export class ApiLogger {
  private readonly logger: PinoLogger;

  constructor(@inject(Config) config: Config) {
    this.logger = pino(ApiLogger.createOptions(config));
  }

  getLogger(): PinoLogger {
    return this.logger;
  }

  child(bindings: Bindings): PinoLogger {
    return this.logger.child(bindings);
  }

  static createOptions(config: Pick<Config, "log">): LoggerOptions {
    if (!config.log.json) {
      return {
        level: config.log.level,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      };
    }

    return {
      level: config.log.level,
    };
  }
}
