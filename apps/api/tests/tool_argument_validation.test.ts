import assert from "node:assert/strict";
import { test } from "vitest";
import { Type } from "@sinclair/typebox";
import { validateToolArguments } from "@mariozechner/pi-ai";
import { AgentToolParameterSchema } from "../src/services/agent/session/pi-mono/tools/parameter_schema.ts";

/**
 * Covers the patched upstream formatter so unknown tool arguments remain strict while the returned
 * error tells the agent which exact key violated the schema.
 */
test("validateToolArguments names unexpected root properties in validation errors", () => {
  const tool = {
    description: "Runs a terminal command",
    name: "execute_command",
    parameters: AgentToolParameterSchema.object({
      command: Type.String(),
    }),
  };

  assert.throws(
    () => validateToolArguments(tool as never, {
      arguments: {
        command: {},
        timeoutMs: 120000,
      },
      id: "tool-call-1",
      name: "execute_command",
      type: "toolCall",
    }),
    (error) => {
      assert.match(String(error), /timeoutMs: must NOT have additional properties/);
      return true;
    },
  );
});

test("validateToolArguments names unexpected nested properties in validation errors", () => {
  const tool = {
    description: "Runs a terminal command",
    name: "execute_command",
    parameters: AgentToolParameterSchema.object({
      environment: AgentToolParameterSchema.object({
        PATH: Type.String(),
      }),
    }),
  };

  assert.throws(
    () => validateToolArguments(tool as never, {
      arguments: {
        environment: {
          PATH: "/usr/bin",
          timeoutMs: 120000,
        },
      },
      id: "tool-call-1",
      name: "execute_command",
      type: "toolCall",
    }),
    (error) => {
      assert.match(String(error), /environment\.timeoutMs: must NOT have additional properties/);
      return true;
    },
  );
});
