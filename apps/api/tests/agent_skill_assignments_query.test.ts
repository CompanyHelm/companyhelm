import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentSkillGroupsQueryResolver } from "../src/graphql/resolvers/agent_skill_groups.ts";
import { AgentSkillsQueryResolver } from "../src/graphql/resolvers/agent_skills.ts";

test("AgentSkillsQueryResolver lists individual skills attached to one agent", async () => {
  const calls: Array<{ agentId: string; companyId: string }> = [];
  const resolver = new AgentSkillsQueryResolver({
    async listAgentSkills(_transactionProvider: unknown, companyId: string, agentId: string) {
      calls.push({
        agentId,
        companyId,
      });

      return [{
        branchName: null,
        companyId,
        description: "Open pages and gather sources.",
        fileList: [],
        githubRepositoryId: null,
        id: "skill-1",
        instructions: "Use the browser carefully.",
        name: "Browser research",
        repository: null,
        skillDirectory: null,
        skillGroupId: "group-1",
        sourceType: "manual",
        trackedCommitSha: null,
      }];
    },
  } as never);

  const result = await resolver.execute(
    null,
    {
      agentId: "agent-1",
    },
    {
      app_runtime_transaction_provider: {} as never,
      authSession: {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
      },
    },
  );

  assert.deepEqual(calls, [{
    agentId: "agent-1",
    companyId: "company-123",
  }]);
  assert.deepEqual(result, [{
    autoUpdate: false,
    branchName: null,
    branchCommitSha: null,
    branchSkillFileUrl: null,
    companyId: "company-123",
    description: "Open pages and gather sources.",
    fileInventory: [],
    fileList: [],
    githubRepositoryId: null,
    id: "skill-1",
    instructions: "Use the browser carefully.",
    name: "Browser research",
    repository: null,
    repositoryUrl: null,
    skillDirectory: null,
    skillDirectoryUrl: null,
    skillGroupId: "group-1",
    skillType: "custom",
    sourceType: "manual",
    systemCommands: [],
    systemKey: null,
    trackedCommitSha: null,
    trackedCommitSkillFileUrl: null,
  }]);
});

test("AgentSkillGroupsQueryResolver lists attached skill groups for one agent", async () => {
  const calls: Array<{ agentId: string; companyId: string }> = [];
  const resolver = new AgentSkillGroupsQueryResolver({
    async listAgentSkillGroups(_transactionProvider: unknown, companyId: string, agentId: string) {
      calls.push({
        agentId,
        companyId,
      });

      return [{
        companyId,
        id: "group-1",
        name: "Research",
      }];
    },
  } as never);

  const result = await resolver.execute(
    null,
    {
      agentId: "agent-1",
    },
    {
      app_runtime_transaction_provider: {} as never,
      authSession: {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
      },
    },
  );

  assert.deepEqual(calls, [{
    agentId: "agent-1",
    companyId: "company-123",
  }]);
  assert.deepEqual(result, [{
    companyId: "company-123",
    id: "group-1",
    name: "Research",
  }]);
});
