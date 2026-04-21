import assert from "node:assert/strict";
import { test } from "vitest";
import { SystemCommandService } from "../src/services/system_command_service.ts";

const workflowRecord = {
  createdAt: new Date("2026-04-20T12:00:00.000Z"),
  description: "Coordinate release work.",
  id: "workflow-1",
  inputs: [],
  instructions: "Keep release state current.",
  isEnabled: true,
  name: "Release workflow",
  steps: [],
  updatedAt: new Date("2026-04-20T12:00:00.000Z"),
};

test("SystemCommandService rejects commands when their owning system skill is inactive", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return false;
      },
    } as never,
    workflowService: {} as never,
  });

  await assert.rejects(
    service.executeCommand("workflow.update", {
      workflowDefinitionId: "workflow-1",
    }, {
      agentId: "agent-1",
      companyId: "company-123",
      sessionId: "session-1",
      transactionProvider: {} as never,
    }),
    /Activate the manage_workflows system skill/,
  );
});

test("SystemCommandService rejects migrated agent commands when manage_agents is inactive", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return false;
      },
    } as never,
    workflowService: {} as never,
  });

  await assert.rejects(
    service.executeCommand("agent.list", {}, {
      agentId: "agent-1",
      companyId: "company-123",
      sessionId: "session-1",
      transactionProvider: {} as never,
    }),
    /Activate the manage_agents system skill/,
  );
});

test("SystemCommandService rejects skill-management commands when manage_skills is inactive", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return false;
      },
    } as never,
    workflowService: {} as never,
  });

  await assert.rejects(
    service.executeCommand("skill.list", {}, {
      agentId: "agent-1",
      companyId: "company-123",
      sessionId: "session-1",
      transactionProvider: {} as never,
    }),
    /Activate the manage_skills system skill/,
  );
});

test("SystemCommandService executes workflow commands when manage_workflows is active", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return true;
      },
    } as never,
    workflowService: {
      async updateWorkflow(_transactionProvider: unknown, input: {
        name?: string | null;
        workflowDefinitionId: string;
      }) {
        assert.equal(input.workflowDefinitionId, "workflow-1");
        assert.equal(input.name, "Release workflow");
        return workflowRecord;
      },
    } as never,
  });

  const result = await service.executeCommand("workflow.update", {
    name: "Release workflow",
    workflowDefinitionId: "workflow-1",
  }, {
    agentId: "agent-1",
    companyId: "company-123",
    sessionId: "session-1",
    transactionProvider: {} as never,
  });

  assert.equal(result.id, "workflow-1");
  assert.equal(result.name, "Release workflow");
});

test("SystemCommandService executes skill-management commands when manage_skills is active", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return true;
      },
    } as never,
    skillService: {
      async listSkillGroups(_transactionProvider: unknown, companyId: string) {
        assert.equal(companyId, "company-123");
        return [{
          companyId,
          id: "group-1",
          name: "Research",
        }];
      },
      async listSkills(_transactionProvider: unknown, companyId: string) {
        assert.equal(companyId, "company-123");
        return [{
          companyId,
          description: "Research guidance",
          fileList: [],
          githubBranchName: null,
          githubTrackedCommitSha: null,
          id: "skill-1",
          instructions: "Read context first.",
          name: "Research",
          repository: null,
          skillDirectory: null,
          skillGroupId: "group-1",
          skillType: "custom",
          systemCommands: [],
          systemKey: null,
        }];
      },
    } as never,
    workflowService: {} as never,
  });

  const result = await service.executeCommand("skill.list", {}, {
    agentId: "agent-1",
    companyId: "company-123",
    sessionId: "session-1",
    transactionProvider: {} as never,
  });

  assert.deepEqual(result.skillGroups, [{
    companyId: "company-123",
    id: "group-1",
    name: "Research",
  }]);
  assert.deepEqual(result.skills, [{
    companyId: "company-123",
    description: "Research guidance",
    fileList: [],
    githubBranchName: null,
    githubTrackedCommitSha: null,
    id: "skill-1",
    instructions: "Read context first.",
    name: "Research",
    repository: null,
    skillDirectory: null,
    skillGroupId: "group-1",
    skillType: "custom",
    systemCommands: [],
    systemKey: null,
  }]);
});

test("SystemCommandService exposes workflow listing through manage_workflows commands", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return true;
      },
    } as never,
    workflowService: {
      async listWorkflows(_transactionProvider: unknown, companyId: string) {
        assert.equal(companyId, "company-123");
        return [{
          description: "Enabled workflow",
          id: "workflow-enabled",
          inputs: [{
            defaultValue: null,
            description: "Target branch",
            isRequired: true,
            name: "branch",
          }],
          isEnabled: true,
          name: "Enabled",
        }, {
          description: "Disabled workflow",
          id: "workflow-disabled",
          inputs: [],
          isEnabled: false,
          name: "Disabled",
        }];
      },
    } as never,
  });

  const result = await service.executeCommand("workflow.list", {}, {
    agentId: "agent-1",
    companyId: "company-123",
    sessionId: "session-1",
    transactionProvider: {} as never,
  });

  assert.deepEqual(result.workflows, [{
    description: "Enabled workflow",
    id: "workflow-enabled",
    inputs: [{
      defaultValue: null,
      description: "Target branch",
      isRequired: true,
      name: "branch",
    }],
    name: "Enabled",
  }]);
});

test("SystemCommandService executes company directory commands when company_directory is active", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return true;
      },
    } as never,
    workflowService: {} as never,
  });
  const transactionProvider = {
    async transaction(callback: (tx: unknown) => Promise<unknown>) {
      return callback({
        select() {
          return {
            from() {
              return {
                async where() {
                  return [{
                    id: "agent-1",
                    name: "Builder",
                  }];
                },
              };
            },
          };
        },
      });
    },
  };

  const result = await service.executeCommand("company_directory.agents.list", {}, {
    agentId: "agent-1",
    companyId: "company-123",
    sessionId: "session-1",
    transactionProvider: transactionProvider as never,
  });

  assert.deepEqual(result.agents, [{
    id: "agent-1",
    name: "Builder",
  }]);
});
