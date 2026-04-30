import assert from "node:assert/strict";
import { test } from "vitest";
import type { Logger as PinoLogger } from "pino";
import { SessionPipelineLogger } from "../src/log/session_pipeline_logger.ts";

test("SessionPipelineLogger injects null-safe pipeline context into every log", () => {
  const debugCalls: Array<{ payload: Record<string, unknown>; message?: string }> = [];
  const childBindings: Array<Record<string, unknown>> = [];
  const baseLogger = {
    child(bindings: Record<string, unknown>) {
      childBindings.push(bindings);
      return baseLogger;
    },
    debug(payload: Record<string, unknown>, message?: string) {
      debugCalls.push({
        message,
        payload,
      });
    },
  } as unknown as PinoLogger;

  const logger = new SessionPipelineLogger(baseLogger, {
    session_id: "session-1",
    trace_id: "trace-1",
  });

  logger.debug({
    event: "session_logger_booted",
  }, "booted logger");

  assert.deepEqual(debugCalls[0], {
    message: "booted logger",
    payload: {
      event: "session_logger_booted",
      message_id: null,
      session_id: "session-1",
      status_from: null,
      status_to: null,
      tool_name: null,
      trace_id: "trace-1",
      turn_id: null,
      worker_id: null,
    },
  });
  assert.deepEqual(childBindings, []);
});

test("SessionPipelineLogger children merge pipeline context while preserving extra child bindings", () => {
  const warnCalls: Array<{ payload: Record<string, unknown>; message?: string }> = [];
  const childBindings: Array<Record<string, unknown>> = [];
  const baseLogger = {
    child(bindings: Record<string, unknown>) {
      childBindings.push(bindings);
      return baseLogger;
    },
    warn(payload: Record<string, unknown>, message?: string) {
      warnCalls.push({
        message,
        payload,
      });
    },
  } as unknown as PinoLogger;

  const logger = new SessionPipelineLogger(baseLogger, {
    session_id: "session-1",
    trace_id: "trace-1",
    worker_id: "worker-1",
  }).child({
    component: "terminal_tool",
    tool_name: "bash_exec",
    turn_id: "turn-1",
  }).child({
    event: "bash_exec_timeout",
    message_id: "message-1",
    status_from: "running",
    status_to: "completed",
  });

  logger.warn({
    timeoutSeconds: 60,
  }, "tool timed out");

  assert.deepEqual(childBindings, [{
    component: "terminal_tool",
  }]);
  assert.deepEqual(warnCalls[0], {
    message: "tool timed out",
    payload: {
      event: "bash_exec_timeout",
      message_id: "message-1",
      session_id: "session-1",
      status_from: "running",
      status_to: "completed",
      timeoutSeconds: 60,
      tool_name: "bash_exec",
      trace_id: "trace-1",
      turn_id: "turn-1",
      worker_id: "worker-1",
    },
  });
});
