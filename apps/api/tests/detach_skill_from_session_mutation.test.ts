import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { DetachSkillFromSessionMutation } from "../src/graphql/mutations/detach_skill_from_session.ts";

test("DetachSkillFromSessionMutation deactivates the skill and removes it from any open environment", async () => {
  const deactivateCalls: Array<{ companyId: string; sessionId: string; skillId: string }> = [];
  const removeCalls: Array<{ agentId: string; sessionId: string; skillId: string }> = [];
  const mutation = new DetachSkillFromSessionMutation(
    {
      async removeSkillFromOpenEnvironmentForSession(_transactionProvider, agentId: string, sessionId: string, skill) {
        removeCalls.push({
          agentId,
          sessionId,
          skillId: skill.id,
        });
        return true;
      },
    } as never,
    {
      async getSession() {
        return {
          agentId: "agent-1",
          id: "session-1",
        };
      },
    } as never,
    {
      async activateSkill() {
        throw new Error("rollback should not run");
      },
      async deactivateSkill(_transactionProvider, input) {
        deactivateCalls.push(input);
      },
    } as never,
    {
      async getSkill() {
        return {
          companyId: "company-123",
          description: "Browser automation guidance.",
          fileList: [],
          githubBranchName: null,
          githubTrackedCommitSha: null,
          id: "skill-1",
          instructions: "Read this first.",
          name: "Browser skill",
          repository: null,
          skillDirectory: null,
          skillGroupId: null,
        };
      },
    } as never,
  );

  const result = await mutation.execute(
    null,
    {
      input: {
        sessionId: "session-1",
        skillId: "skill-1",
      },
    },
    {
      app_runtime_transaction_provider: {} as never,
      authSession: {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
      },
    } as never,
  );

  assert.deepEqual(deactivateCalls, [{
    companyId: "company-123",
    sessionId: "session-1",
    skillId: "skill-1",
  }]);
  assert.deepEqual(removeCalls, [{
    agentId: "agent-1",
    sessionId: "session-1",
    skillId: "skill-1",
  }]);
  assert.deepEqual(result, {
    companyId: "company-123",
    description: "Browser automation guidance.",
    fileList: [],
    githubBranchName: null,
    githubTrackedCommitSha: null,
    id: "skill-1",
    instructions: "Read this first.",
    name: "Browser skill",
    repository: null,
    skillDirectory: null,
    skillGroupId: null,
  });
});
