import type { Bindings, Logger as PinoLogger } from "pino";

export type SessionPipelineLogContext = {
  event?: string | null;
  message_id?: string | null;
  session_id?: string | null;
  status_from?: string | null;
  status_to?: string | null;
  tool_name?: string | null;
  trace_id?: string | null;
  turn_id?: string | null;
  worker_id?: string | null;
};

type SessionPipelineResolvedContext = {
  event: string | null;
  message_id: string | null;
  session_id: string | null;
  status_from: string | null;
  status_to: string | null;
  tool_name: string | null;
  trace_id: string | null;
  turn_id: string | null;
  worker_id: string | null;
};

type SessionPipelineLogLevel = "debug" | "error" | "info" | "warn";

/**
 * Wraps the shared pino logger with stable session-pipeline correlation fields so worker,
 * execution, and PI Mono runtime logs can always be filtered by the same identifiers even when a
 * given log line has not learned every piece of context yet.
 */
export class SessionPipelineLogger {
  private static readonly pipelineContextKeys = new Set<keyof SessionPipelineResolvedContext>([
    "event",
    "message_id",
    "session_id",
    "status_from",
    "status_to",
    "tool_name",
    "trace_id",
    "turn_id",
    "worker_id",
  ]);

  private readonly context: SessionPipelineResolvedContext;
  private readonly logger: PinoLogger;

  constructor(logger: PinoLogger, context: SessionPipelineLogContext = {}) {
    this.logger = logger;
    this.context = SessionPipelineLogger.resolveContext(context);
  }

  child(bindings: Record<string, unknown> = {}): SessionPipelineLogger {
    const pipelineContext = SessionPipelineLogger.extractPipelineContext(bindings);
    const loggerBindings = SessionPipelineLogger.extractLoggerBindings(bindings);
    const childLogger = Object.keys(loggerBindings).length > 0 && typeof this.logger.child === "function"
      ? this.logger.child(loggerBindings)
      : this.logger;
    return new SessionPipelineLogger(childLogger, SessionPipelineLogger.mergeContext(this.context, pipelineContext));
  }

  debug(payload: Record<string, unknown>, message?: string): void {
    this.log("debug", payload, message);
  }

  info(payload: Record<string, unknown>, message?: string): void {
    this.log("info", payload, message);
  }

  warn(payload: Record<string, unknown>, message?: string): void {
    this.log("warn", payload, message);
  }

  error(payload: Record<string, unknown>, message?: string): void {
    this.log("error", payload, message);
  }

  getContext(): SessionPipelineResolvedContext {
    return {
      ...this.context,
    };
  }

  private log(level: SessionPipelineLogLevel, payload: Record<string, unknown>, message?: string): void {
    this.logger[level]({
      ...this.context,
      ...payload,
    }, message);
  }

  private static extractLoggerBindings(bindings: Record<string, unknown>): Bindings {
    const loggerBindings: Bindings = {};
    for (const [key, value] of Object.entries(bindings)) {
      if (SessionPipelineLogger.pipelineContextKeys.has(key as keyof SessionPipelineResolvedContext)) {
        continue;
      }

      loggerBindings[key] = value;
    }
    return loggerBindings;
  }

  private static extractPipelineContext(bindings: Record<string, unknown>): SessionPipelineLogContext {
    return {
      event: SessionPipelineLogger.readStringBinding(bindings, "event"),
      message_id: SessionPipelineLogger.readStringBinding(bindings, "message_id"),
      session_id: SessionPipelineLogger.readStringBinding(bindings, "session_id"),
      status_from: SessionPipelineLogger.readStringBinding(bindings, "status_from"),
      status_to: SessionPipelineLogger.readStringBinding(bindings, "status_to"),
      tool_name: SessionPipelineLogger.readStringBinding(bindings, "tool_name"),
      trace_id: SessionPipelineLogger.readStringBinding(bindings, "trace_id"),
      turn_id: SessionPipelineLogger.readStringBinding(bindings, "turn_id"),
      worker_id: SessionPipelineLogger.readStringBinding(bindings, "worker_id"),
    };
  }

  private static readStringBinding(
    bindings: Record<string, unknown>,
    key: keyof SessionPipelineResolvedContext,
  ): string | null | undefined {
    if (!(key in bindings)) {
      return undefined;
    }

    const value = bindings[key];
    if (typeof value === "string") {
      return value;
    }

    return value == null ? null : String(value);
  }

  private static resolveContext(context: SessionPipelineLogContext): SessionPipelineResolvedContext {
    return {
      event: SessionPipelineLogger.resolveString(context.event),
      message_id: SessionPipelineLogger.resolveString(context.message_id),
      session_id: SessionPipelineLogger.resolveString(context.session_id),
      status_from: SessionPipelineLogger.resolveString(context.status_from),
      status_to: SessionPipelineLogger.resolveString(context.status_to),
      tool_name: SessionPipelineLogger.resolveString(context.tool_name),
      trace_id: SessionPipelineLogger.resolveString(context.trace_id),
      turn_id: SessionPipelineLogger.resolveString(context.turn_id),
      worker_id: SessionPipelineLogger.resolveString(context.worker_id),
    };
  }

  private static mergeContext(
    existingContext: SessionPipelineResolvedContext,
    nextContext: SessionPipelineLogContext,
  ): SessionPipelineLogContext {
    return {
      event: nextContext.event === undefined ? existingContext.event : nextContext.event,
      message_id: nextContext.message_id === undefined ? existingContext.message_id : nextContext.message_id,
      session_id: nextContext.session_id === undefined ? existingContext.session_id : nextContext.session_id,
      status_from: nextContext.status_from === undefined ? existingContext.status_from : nextContext.status_from,
      status_to: nextContext.status_to === undefined ? existingContext.status_to : nextContext.status_to,
      tool_name: nextContext.tool_name === undefined ? existingContext.tool_name : nextContext.tool_name,
      trace_id: nextContext.trace_id === undefined ? existingContext.trace_id : nextContext.trace_id,
      turn_id: nextContext.turn_id === undefined ? existingContext.turn_id : nextContext.turn_id,
      worker_id: nextContext.worker_id === undefined ? existingContext.worker_id : nextContext.worker_id,
    };
  }

  private static resolveString(value: string | null | undefined): string | null {
    return value ?? null;
  }
}
