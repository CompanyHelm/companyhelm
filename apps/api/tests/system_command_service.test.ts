import assert from "node:assert/strict";
import { test, vi } from "vitest";
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

test("SystemCommandService rejects task-management commands when manage_tasks is inactive", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return false;
      },
    } as never,
    workflowService: {} as never,
  });

  await assert.rejects(
    service.executeCommand("task.update", {
      taskId: "task-1",
      status: "completed",
    }, {
      agentId: "agent-1",
      companyId: "company-123",
      sessionId: "session-1",
      transactionProvider: {} as never,
    }),
    /Activate the manage_tasks system skill/,
  );
});

test("SystemCommandService rejects GitHub installation commands when manage_github_installations is inactive", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return false;
      },
    } as never,
    workflowService: {} as never,
  });

  await assert.rejects(
    service.executeCommand("github.installation.start", {}, {
      agentId: "agent-1",
      companyId: "company-123",
      sessionId: "session-1",
      transactionProvider: {} as never,
    }),
    /Activate the manage_github_installations system skill/,
  );
});

test("SystemCommandService starts GitHub installation flows when manage_github_installations is active", async () => {
  const createState = vi.fn().mockReturnValue("signed-state");
  const buildInstallationUrl = vi.fn().mockReturnValue("https://github.com/apps/companyhelm/installations/new?state=signed-state");
  const resolveForCompany = vi.fn().mockResolvedValue("acme");
  const transactionProvider = {
    async transaction(callback: (tx: unknown) => Promise<unknown>) {
      return callback({
        select() {
          return {
            from() {
              return {
                where() {
                  return {
                    async limit() {
                      return [{
                        ownerUserId: "user-123",
                      }];
                    },
                  };
                },
              };
            },
          };
        },
      });
    },
  };
  const service = new SystemCommandService({
    githubClient: {
      buildInstallationUrl,
    } as never,
    githubInstallationStateService: {
      createState,
    } as never,
    organizationSlugResolver: {
      resolveForCompany,
    } as never,
    sessionSkillService: {
      async isSystemSkillActive(_transactionProvider: unknown, input: {
        systemSkillKey: string;
      }) {
        assert.equal(input.systemSkillKey, "manage_github_installations");
        return true;
      },
    } as never,
    workflowService: {} as never,
  });

  const result = await service.executeCommand("github.installation.start", {}, {
    agentId: "agent-1",
    companyId: "company-123",
    sessionId: "session-1",
    transactionProvider: transactionProvider as never,
  });

  assert.deepEqual(resolveForCompany.mock.calls, [[transactionProvider, "company-123"]]);
  assert.deepEqual(createState.mock.calls, [[{
    companyId: "company-123",
    organizationSlug: "acme",
    returnPath: "/orgs/acme/chats?agentId=agent-1&sessionId=session-1",
    sourceSessionId: "session-1",
    userId: "user-123",
  }]]);
  assert.deepEqual(buildInstallationUrl.mock.calls, [["signed-state"]]);
  assert.deepEqual(result, {
    installationUrl: "https://github.com/apps/companyhelm/installations/new?state=signed-state",
    returnPath: "/orgs/acme/chats?agentId=agent-1&sessionId=session-1",
    sourceSessionId: "session-1",
    status: "waiting_for_user",
  });
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

test("SystemCommandService updates workflow steps when manage_workflows is active", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return true;
      },
    } as never,
    workflowService: {
      async updateWorkflowStep(_transactionProvider: unknown, input: {
        companyId: string;
        instructions?: string | null;
        name?: string | null;
        stepId: string;
        workflowDefinitionId: string;
      }) {
        assert.equal(input.companyId, "company-123");
        assert.equal(input.workflowDefinitionId, "workflow-1");
        assert.equal(input.stepId, "step-1");
        assert.equal(input.instructions, "New instructions");
        assert.equal(input.name, "Updated step");

        return {
          ...workflowRecord,
          steps: [{
            createdAt: new Date("2026-04-20T12:00:00.000Z"),
            id: "step-row-1",
            instructions: "New instructions",
            name: "Updated step",
            ordinal: 1,
            stepId: "step-1",
            workflowDefinitionId: "workflow-1",
          }, {
            createdAt: new Date("2026-04-20T12:05:00.000Z"),
            id: "step-row-2",
            instructions: "Keep this",
            name: "Second step",
            ordinal: 2,
            stepId: "step-2",
            workflowDefinitionId: "workflow-1",
          }],
        };
      },
    } as never,
  });

  const result = await service.executeCommand("workflow.steps.update", {
    instructions: "New instructions",
    name: "Updated step",
    stepId: "step-1",
    workflowDefinitionId: "workflow-1",
  }, {
    agentId: "agent-1",
    companyId: "company-123",
    sessionId: "session-1",
    transactionProvider: {} as never,
  });

  assert.equal(result.id, "workflow-1");
  assert.deepEqual(result.steps, [{
    id: "step-row-1",
    instructions: "New instructions",
    name: "Updated step",
    ordinal: 1,
    stepId: "step-1",
  }, {
    id: "step-row-2",
    instructions: "Keep this",
    name: "Second step",
    ordinal: 2,
    stepId: "step-2",
  }]);
});

test("SystemCommandService rejects workflow step updates when the target step does not exist", async () => {
  const updateWorkflowStep = vi.fn(async (_transactionProvider: unknown, input: {
    companyId: string;
    instructions?: string | null;
    name?: string | null;
    stepId: string;
    workflowDefinitionId: string;
  }) => {
    assert.equal(input.companyId, "company-123");
    assert.equal(input.workflowDefinitionId, "workflow-1");
    assert.equal(input.stepId, "missing-step");
    throw new Error("Workflow step missing-step not found.");
  });
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return true;
      },
    } as never,
    workflowService: {
      updateWorkflowStep,
    } as never,
  });

  await assert.rejects(
    service.executeCommand("workflow.steps.update", {
      stepId: "missing-step",
      workflowDefinitionId: "workflow-1",
    }, {
      agentId: "agent-1",
      companyId: "company-123",
      sessionId: "session-1",
      transactionProvider: {} as never,
    }),
    /Workflow step missing-step not found\./,
  );
  assert.equal(updateWorkflowStep.mock.calls.length, 1);
});

test("SystemCommandService deletes workflow steps when the stable workflow step id is provided", async () => {
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return true;
      },
    } as never,
    workflowService: {
      async deleteWorkflowStep(_transactionProvider: unknown, input: {
        companyId: string;
        stepId: string;
        workflowDefinitionId: string;
      }) {
        assert.equal(input.companyId, "company-123");
        assert.equal(input.workflowDefinitionId, "workflow-1");
        assert.equal(input.stepId, "step-1");

        return {
          ...workflowRecord,
          steps: [{
            createdAt: new Date("2026-04-20T12:05:00.000Z"),
            id: "step-row-2",
            instructions: "Keep this",
            name: "Second step",
            ordinal: 1,
            stepId: "step-2",
            workflowDefinitionId: "workflow-1",
          }],
        };
      },
    } as never,
  });

  const result = await service.executeCommand("workflow.steps.delete", {
    stepId: "step-1",
    workflowDefinitionId: "workflow-1",
  }, {
    agentId: "agent-1",
    companyId: "company-123",
    sessionId: "session-1",
    transactionProvider: {} as never,
  });

  assert.deepEqual(result.steps, [{
    id: "step-row-2",
    instructions: "Keep this",
    name: "Second step",
    ordinal: 1,
    stepId: "step-2",
  }]);
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
          branchName: null,
          trackedCommitSha: null,
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
    branchName: null,
    trackedCommitSha: null,
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

test("SystemCommandService executes task-management commands when manage_tasks is active", async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive() {
        return true;
      },
    } as never,
    taskService: {
      async updateTask(_transactionProvider: unknown, input: Record<string, unknown>) {
        capturedInput = input;
        return {
          assignedAt: null,
          assignee: null,
          completedAt: new Date("2026-04-20T13:00:00.000Z"),
          createdAt: new Date("2026-04-20T12:00:00.000Z"),
          description: null,
          id: "task-1",
          name: "Ship task commands",
          status: "completed",
          taskStageId: "stage-done",
          taskStageName: "Done",
          updatedAt: new Date("2026-04-20T13:00:00.000Z"),
        };
      },
    } as never,
    workflowService: {} as never,
  });

  const result = await service.executeCommand("task.update", {
    status: "completed",
    taskId: "task-1",
  }, {
    agentId: "agent-1",
    companyId: "company-123",
    sessionId: "session-1",
    transactionProvider: "transaction-provider" as never,
  });

  assert.deepEqual(capturedInput, {
    assignedAgentId: undefined,
    assignedUserId: undefined,
    actorAgentId: "agent-1",
    companyId: "company-123",
    description: undefined,
    name: undefined,
    sessionId: "session-1",
    status: "completed",
    taskStageId: undefined,
    taskId: "task-1",
  });
  assert.deepEqual(result.task, {
    assignedAt: null,
    assignee: null,
    completedAt: "2026-04-20T13:00:00.000Z",
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id: "task-1",
    name: "Ship task commands",
    status: "completed",
    taskStageId: "stage-done",
    taskStageName: "Done",
    updatedAt: "2026-04-20T13:00:00.000Z",
  });
});

test("SystemCommandService executes agent default skill and MCP commands when manage_agents is active", async () => {
  const calls: string[] = [];
  const service = new SystemCommandService({
    mcpService: {
      async listAgentMcpServers(_transactionProvider: unknown, companyId: string, agentId: string) {
        calls.push("mcp-list");
        assert.equal(companyId, "company-123");
        assert.equal(agentId, "agent-2");
        return [{
          authType: "none",
          callTimeoutMs: 10_000,
          companyId,
          createdAt: new Date("2026-04-20T12:00:00.000Z"),
          description: "Docs tools",
          enabled: true,
          headers: {},
          id: "mcp-1",
          name: "Docs MCP",
          oauthClientId: null,
          oauthConnectionStatus: null,
          oauthGrantedScopes: [],
          oauthLastError: null,
          oauthRequestedScopes: [],
          updatedAt: new Date("2026-04-20T12:30:00.000Z"),
          url: "https://mcp.example.com",
        }];
      },
    } as never,
    sessionSkillService: {
      async isSystemSkillActive() {
        return true;
      },
    } as never,
    skillService: {
      async listAgentSkillGroups(_transactionProvider: unknown, companyId: string, agentId: string) {
        calls.push("skill-groups-list");
        assert.equal(companyId, "company-123");
        assert.equal(agentId, "agent-2");
        return [{
          companyId,
          id: "group-1",
          name: "Research",
        }];
      },
      async listAgentSkills(_transactionProvider: unknown, companyId: string, agentId: string) {
        calls.push("skills-list");
        assert.equal(companyId, "company-123");
        assert.equal(agentId, "agent-2");
        return [{
          companyId,
          description: "Research guidance",
          fileList: [],
          branchName: null,
          trackedCommitSha: null,
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
      async attachSkillToAgent(_transactionProvider: unknown, input: {
        agentId: string;
        companyId: string;
        skillId: string;
        userId: string | null;
      }) {
        calls.push("skill-attach");
        assert.deepEqual(input, {
          agentId: "agent-2",
          companyId: "company-123",
          skillId: "skill-1",
          userId: null,
        });
        return {
          companyId: input.companyId,
          description: "Research guidance",
          fileList: [],
          branchName: null,
          trackedCommitSha: null,
          id: input.skillId,
          instructions: "Read context first.",
          name: "Research",
          repository: null,
          skillDirectory: null,
          skillGroupId: "group-1",
          skillType: "custom",
          systemCommands: [],
          systemKey: null,
        };
      },
      async detachSkillFromAgent(
        _transactionProvider: unknown,
        companyId: string,
        agentId: string,
        skillId: string,
      ) {
        calls.push("skill-detach");
        assert.equal(companyId, "company-123");
        assert.equal(agentId, "agent-2");
        assert.equal(skillId, "skill-1");
        return {
          companyId,
          description: "Research guidance",
          fileList: [],
          branchName: null,
          trackedCommitSha: null,
          id: skillId,
          instructions: "Read context first.",
          name: "Research",
          repository: null,
          skillDirectory: null,
          skillGroupId: "group-1",
          skillType: "custom",
          systemCommands: [],
          systemKey: null,
        };
      },
      async attachSkillGroupToAgent(_transactionProvider: unknown, input: {
        agentId: string;
        companyId: string;
        skillGroupId: string;
        userId: string | null;
      }) {
        calls.push("skill-group-attach");
        assert.deepEqual(input, {
          agentId: "agent-2",
          companyId: "company-123",
          skillGroupId: "group-1",
          userId: null,
        });
        return {
          companyId: input.companyId,
          id: input.skillGroupId,
          name: "Research",
        };
      },
      async detachSkillGroupFromAgent(
        _transactionProvider: unknown,
        companyId: string,
        agentId: string,
        skillGroupId: string,
      ) {
        calls.push("skill-group-detach");
        assert.equal(companyId, "company-123");
        assert.equal(agentId, "agent-2");
        assert.equal(skillGroupId, "group-1");
        return {
          companyId,
          id: skillGroupId,
          name: "Research",
        };
      },
    } as never,
    workflowService: {} as never,
  });
  const context = {
    agentId: "agent-1",
    companyId: "company-123",
    sessionId: "session-1",
    transactionProvider: {} as never,
  };

  const skillList = await service.executeCommand("agent.skills.list", {
    agentId: "agent-2",
  }, context);
  const attachedSkill = await service.executeCommand("agent.skill.attach", {
    agentId: "agent-2",
    skillId: "skill-1",
  }, context);
  await service.executeCommand("agent.skill.detach", {
    agentId: "agent-2",
    skillId: "skill-1",
  }, context);
  await service.executeCommand("agent.skill_group.attach", {
    agentId: "agent-2",
    skillGroupId: "group-1",
  }, context);
  await service.executeCommand("agent.skill_group.detach", {
    agentId: "agent-2",
    skillGroupId: "group-1",
  }, context);
  const mcpList = await service.executeCommand("agent.mcps.list", {
    agentId: "agent-2",
  }, context);

  assert.equal((attachedSkill.skill as Record<string, unknown>).id, "skill-1");
  assert.equal((skillList.skillGroups as Array<Record<string, unknown>>)[0]?.id, "group-1");
  assert.equal((skillList.skills as Array<Record<string, unknown>>)[0]?.id, "skill-1");
  assert.equal((mcpList.mcpServers as Array<Record<string, unknown>>)[0]?.id, "mcp-1");
  assert.deepEqual(calls, [
    "skill-groups-list",
    "skills-list",
    "skill-attach",
    "skill-detach",
    "skill-group-attach",
    "skill-group-detach",
    "mcp-list",
  ]);
});

test("SystemCommandService exposes all workflow definitions through manage_workflows commands", async () => {
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
    isEnabled: true,
    name: "Enabled",
  }, {
    description: "Disabled workflow",
    id: "workflow-disabled",
    inputs: [],
    isEnabled: false,
    name: "Disabled",
  }]);
});

test("SystemCommandService exposes enabled workflow execution commands through execute_workflows", async () => {
  const transactionProvider = {
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      return callback({
        select() {
          return {
            from() {
              return {
                async where() {
                  return [];
                },
              };
            },
          };
        },
      });
    },
  };
  const service = new SystemCommandService({
    sessionSkillService: {
      async isSystemSkillActive(_transactionProvider: unknown, input: {
        systemSkillKey: string;
      }) {
        assert.equal(input.systemSkillKey, "execute_workflows");
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
      async startLocalWorkflowRun(_transactionProvider: unknown, input: {
        agentId: string;
        sessionId: string;
        workflowDefinitionId: string;
      }) {
        assert.equal(input.agentId, "agent-1");
        assert.equal(input.sessionId, "session-1");
        assert.equal(input.workflowDefinitionId, "workflow-enabled");
        return {
          executionInstructions: [
            "Execute the following workflow run.",
            "Workflow:",
            "Enabled",
            "Workflow run steps:",
            "1. Build",
          ].join("\n"),
          workflowRun: {
            agentId: input.agentId,
            completedAt: null,
            createdAt: new Date("2026-04-20T12:00:00.000Z"),
            id: "workflow-run-1",
            instructions: "Run locally",
            sessionId: input.sessionId,
            source: "manual",
            startedAt: new Date("2026-04-20T12:00:00.000Z"),
            status: "running",
            steps: [],
            triggerId: null,
            updatedAt: new Date("2026-04-20T12:00:00.000Z"),
            workflowDefinitionId: input.workflowDefinitionId,
          },
        };
      },
    } as never,
  });
  const context = {
    agentId: "agent-1",
    companyId: "company-123",
    sessionId: "session-1",
    transactionProvider: transactionProvider as never,
  };

  const listResult = await service.executeCommand("workflow.execution.list", {}, context);
  const startResult = await service.executeCommand("workflow.execution.start", {
    input: {
      branch: "main",
    },
    workflowDefinitionId: "workflow-enabled",
  }, context);

  assert.deepEqual(listResult.workflows, [{
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
  assert.match((startResult.startedWorkflow as Record<string, string>).executionInstructions, /Execute the following workflow run/);
  assert.equal(((startResult.startedWorkflow as Record<string, unknown>).workflowRun as Record<string, unknown>).sessionId, "session-1");
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
