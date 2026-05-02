import assert from "node:assert/strict";
import { test } from "vitest";
import { agentSkillGroups, agentSkills, agents, skill_groups, skills } from "../src/db/schema.ts";
import { SkillService } from "../src/services/skills/service.ts";

type MockAgentRecord = {
  companyId: string;
  id: string;
};

type MockAgentSkillGroupAttachmentRecord = {
  agentId: string;
  companyId: string;
  createdAt: Date;
  createdByUserId: string | null;
  skillGroupId: string | null;
  systemSkillGroupKey: string | null;
};

type MockAgentSkillAttachmentRecord = {
  agentId: string;
  companyId: string;
  createdAt: Date;
  createdByUserId: string | null;
  skillId: string | null;
  systemSkillKey?: string | null;
};

type MockSkillGroupRecord = {
  companyId: string;
  id: string;
  name: string;
};

type MockSkillRecord = {
  companyId: string;
  description: string;
  fileList: string[];
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
  skillGroupId: string | null;
};

class AgentSkillDefaultsServiceTestHarness {
  static createTransactionProvider(input: {
    agentSkillGroupAttachments?: MockAgentSkillGroupAttachmentRecord[];
    agentSkillAttachments?: MockAgentSkillAttachmentRecord[];
    agents: MockAgentRecord[];
    groups: MockSkillGroupRecord[];
    skills: MockSkillRecord[];
  }) {
    const groups = [...input.groups];
    const skillRecords = [...input.skills];
    const agentRecords = [...input.agents];
    const agentSkillGroupAttachments = [...(input.agentSkillGroupAttachments ?? [])];
    const agentSkillAttachments = [...(input.agentSkillAttachments ?? [])];

    const database = {
      select(selection: Record<string, unknown>) {
        return {
          from(table: unknown) {
            return {
              async where(_condition: unknown) {
                void _condition;
                if (table === agents) {
                  return [...agentRecords];
                }
                if (table === skill_groups) {
                  return [...groups];
                }
                if (table === skills) {
                  return [...skillRecords];
                }
                if (table === agentSkillGroups) {
                  const selectedKeys = Object.keys(selection);
                  const selectedAttachments = selectedKeys.includes("skillGroupId")
                    && selectedKeys.includes("systemSkillGroupKey")
                    ? agentSkillGroupAttachments
                    : agentSkillGroupAttachments.filter((attachment) => {
                      return selectedKeys.includes("systemSkillGroupKey")
                        ? attachment.systemSkillGroupKey !== null
                        : attachment.skillGroupId !== null;
                    });

                  return selectedAttachments.map((attachment) => ({
                    skillGroupId: attachment.skillGroupId,
                    systemSkillGroupKey: attachment.systemSkillGroupKey,
                  }));
                }
                if (table === agentSkills) {
                  return agentSkillAttachments.map((attachment) => ({
                    skillId: attachment.skillId,
                    systemSkillKey: attachment.systemSkillKey ?? null,
                  }));
                }

                throw new Error("Unexpected select table.");
              },
            };
          },
        };
      },
      insert(table: unknown) {
        if (table === agentSkillGroups) {
          return {
            values(value: Record<string, unknown>) {
              agentSkillGroupAttachments.push({
                agentId: String(value.agentId),
                companyId: String(value.companyId),
                createdAt: value.createdAt as Date,
                createdByUserId: value.createdByUserId ? String(value.createdByUserId) : null,
                skillGroupId: value.skillGroupId ? String(value.skillGroupId) : null,
                systemSkillGroupKey: value.systemSkillGroupKey ? String(value.systemSkillGroupKey) : null,
              });

              return {};
            },
          };
        }
        if (table === agentSkills) {
          return {
            values(value: Record<string, unknown>) {
              agentSkillAttachments.push({
                agentId: String(value.agentId),
                companyId: String(value.companyId),
                createdAt: value.createdAt as Date,
                createdByUserId: value.createdByUserId ? String(value.createdByUserId) : null,
                skillId: value.skillId ? String(value.skillId) : null,
                systemSkillKey: value.systemSkillKey ? String(value.systemSkillKey) : null,
              });

              return {};
            },
          };
        }

        throw new Error("Unexpected insert table.");
      },
      delete(table: unknown) {
        if (table === agentSkillGroups) {
          return {
            where(_condition: unknown) {
              void _condition;
              return {
                async returning() {
                  const [deletedAttachment] = agentSkillGroupAttachments.splice(0, 1);
                  return deletedAttachment
                    ? [{
                      skillGroupId: deletedAttachment.skillGroupId,
                      systemSkillGroupKey: deletedAttachment.systemSkillGroupKey,
                    }]
                    : [];
                },
              };
            },
          };
        }
        if (table === agentSkills) {
          return {
            where(_condition: unknown) {
              void _condition;
              return {
                async returning() {
                  const [deletedAttachment] = agentSkillAttachments.splice(0, 1);
                  return deletedAttachment
                    ? [{
                      skillId: deletedAttachment.skillId,
                      systemSkillKey: deletedAttachment.systemSkillKey ?? null,
                    }]
                    : [];
                },
              };
            },
          };
        }

        throw new Error("Unexpected delete table.");
      },
    };

    return {
      agentSkillAttachments,
      agentSkillGroupAttachments,
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback(database);
      },
    };
  }
}

test("SkillService stores distinct agent skill defaults and lists them back", async () => {
  const transactionProvider = AgentSkillDefaultsServiceTestHarness.createTransactionProvider({
    agents: [{
      companyId: "company-123",
      id: "agent-1",
    }],
    groups: [{
      companyId: "company-123",
      id: "group-1",
      name: "Research",
    }],
    skills: [{
      companyId: "company-123",
      description: "Open pages and gather sources.",
      fileList: [],
      id: "skill-1",
      instructions: "Use the browser carefully.",
      name: "Browser research",
      repository: null,
      skillDirectory: null,
      skillGroupId: "group-1",
    }],
  });
  const service = new SkillService();

  await service.attachSkillGroupToAgent(transactionProvider as never, {
    agentId: "agent-1",
    companyId: "company-123",
    skillGroupId: "group-1",
    userId: "user-1",
  });
  await service.attachSkillGroupToAgent(transactionProvider as never, {
    agentId: "agent-1",
    companyId: "company-123",
    skillGroupId: "group-1",
    userId: "user-1",
  });
  await service.attachSkillGroupToAgent(transactionProvider as never, {
    agentId: "agent-1",
    companyId: "company-123",
    skillGroupId: "system",
    userId: "user-1",
  });
  await service.attachSkillGroupToAgent(transactionProvider as never, {
    agentId: "agent-1",
    companyId: "company-123",
    skillGroupId: "system",
    userId: "user-1",
  });
  await service.attachSkillToAgent(transactionProvider as never, {
    agentId: "agent-1",
    companyId: "company-123",
    skillId: "skill-1",
    userId: "user-1",
  });
  await service.attachSkillToAgent(transactionProvider as never, {
    agentId: "agent-1",
    companyId: "company-123",
    skillId: "skill-1",
    userId: "user-1",
  });

  assert.equal(transactionProvider.agentSkillGroupAttachments.length, 2);
  assert.equal(transactionProvider.agentSkillAttachments.length, 1);

  const attachedGroups = await service.listAgentSkillGroups(transactionProvider as never, "company-123", "agent-1");
  const attachedSkills = await service.listAgentSkills(transactionProvider as never, "company-123", "agent-1");

  assert.deepEqual(attachedGroups.map((group) => group.id), ["group-1", "system"]);
  assert.deepEqual(attachedSkills.map((skill) => skill.id), ["skill-1"]);
});

test("SkillService detaches agent skill defaults independently", async () => {
  const transactionProvider = AgentSkillDefaultsServiceTestHarness.createTransactionProvider({
    agentSkillGroupAttachments: [{
      agentId: "agent-1",
      companyId: "company-123",
      createdAt: new Date("2026-04-08T12:00:00.000Z"),
      createdByUserId: "user-1",
      skillGroupId: "group-1",
      systemSkillGroupKey: null,
    }, {
      agentId: "agent-1",
      companyId: "company-123",
      createdAt: new Date("2026-04-08T12:00:00.000Z"),
      createdByUserId: "user-1",
      skillGroupId: null,
      systemSkillGroupKey: "system",
    }],
    agentSkillAttachments: [{
      agentId: "agent-1",
      companyId: "company-123",
      createdAt: new Date("2026-04-08T12:00:00.000Z"),
      createdByUserId: "user-1",
      skillId: "skill-1",
      systemSkillKey: null,
    }],
    agents: [{
      companyId: "company-123",
      id: "agent-1",
    }],
    groups: [{
      companyId: "company-123",
      id: "group-1",
      name: "Research",
    }],
    skills: [{
      companyId: "company-123",
      description: "Open pages and gather sources.",
      fileList: [],
      id: "skill-1",
      instructions: "Use the browser carefully.",
      name: "Browser research",
      repository: null,
      skillDirectory: null,
      skillGroupId: "group-1",
    }],
  });
  const service = new SkillService();

  const detachedGroup = await service.detachSkillGroupFromAgent(
    transactionProvider as never,
    "company-123",
    "agent-1",
    "group-1",
  );
  const detachedSkill = await service.detachSkillFromAgent(
    transactionProvider as never,
    "company-123",
    "agent-1",
    "skill-1",
  );
  const detachedSystemGroup = await service.detachSkillGroupFromAgent(
    transactionProvider as never,
    "company-123",
    "agent-1",
    "system",
  );

  assert.equal(detachedGroup.id, "group-1");
  assert.equal(detachedSkill.id, "skill-1");
  assert.equal(detachedSystemGroup.id, "system");
  assert.equal(transactionProvider.agentSkillGroupAttachments.length, 0);
  assert.equal(transactionProvider.agentSkillAttachments.length, 0);
});

test("SkillService expands attached system skill group into available system skills", async () => {
  const transactionProvider = AgentSkillDefaultsServiceTestHarness.createTransactionProvider({
    agentSkillGroupAttachments: [{
      agentId: "agent-1",
      companyId: "company-123",
      createdAt: new Date("2026-04-08T12:00:00.000Z"),
      createdByUserId: "user-1",
      skillGroupId: null,
      systemSkillGroupKey: "system",
    }],
    agents: [{
      companyId: "company-123",
      id: "agent-1",
    }],
    groups: [],
    skills: [],
  });
  const service = new SkillService();

  const availableSkills = await service.listAgentAvailableSkills(
    transactionProvider as never,
    "company-123",
    "agent-1",
  );

  assert.deepEqual(
    availableSkills.map((skill) => skill.id),
    [
      "system:access_past_messages",
      "system:company_directory",
      "system:companyhelm_guide",
      "system:execute_workflows",
      "system:manage_agents",
      "system:manage_artifacts",
      "system:manage_github_installations",
      "system:manage_skills",
      "system:manage_tasks",
      "system:manage_workflows",
    ],
  );
});
