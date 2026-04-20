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
