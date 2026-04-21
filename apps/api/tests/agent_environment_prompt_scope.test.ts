import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentEnvironmentPromptScope } from "../src/services/environments/prompt_scope.ts";

test("AgentEnvironmentPromptScope clears a failed environment acquisition during dispose", async () => {
  let disposeCalls = 0;
  let getEnvironmentCalls = 0;
  const scope = new AgentEnvironmentPromptScope(
    {} as never,
    {
      async getEnvironmentForSession() {
        getEnvironmentCalls += 1;
        if (getEnvironmentCalls === 1) {
          throw new Error("connect failed");
        }

        return {
          async dispose() {
            disposeCalls += 1;
          },
        };
      },
      async syncSkillIntoOpenEnvironmentForSession() {
        return false;
      },
    } as never,
    "agent-1",
    "session-1",
  );

  await assert.rejects(scope.getEnvironment(), /connect failed/);
  await scope.dispose();

  await scope.getEnvironment();
  await scope.dispose();

  assert.equal(getEnvironmentCalls, 2);
  assert.equal(disposeCalls, 1);
});
