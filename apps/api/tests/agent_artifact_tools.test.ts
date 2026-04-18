import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentArchiveArtifactTool } from "../src/services/agent/session/pi-mono/tools/artifacts/archive_artifact.ts";
import { AgentCreateMarkdownArtifactTool } from "../src/services/agent/session/pi-mono/tools/artifacts/create_markdown_artifact.ts";
import { AgentArtifactToolProvider } from "../src/services/agent/session/pi-mono/tools/artifacts/provider.ts";
import { AgentArtifactToolService } from "../src/services/agent/session/pi-mono/tools/artifacts/service.ts";

test("AgentArtifactToolProvider contributes the artifact catalog tools", () => {
  const provider = new AgentArtifactToolProvider({
    async archiveArtifact() {
      throw new Error("artifact archive is lazy");
    },
    async createExternalLinkArtifact() {
      throw new Error("artifact creation is lazy");
    },
    async createMarkdownArtifact() {
      throw new Error("artifact creation is lazy");
    },
    async createPullRequestArtifact() {
      throw new Error("artifact creation is lazy");
    },
    async getArtifact() {
      throw new Error("artifact reads are lazy");
    },
    async listArtifacts() {
      throw new Error("artifact listing is lazy");
    },
    async updateArtifactMetadata() {
      throw new Error("artifact updates are lazy");
    },
    async updateExternalLinkArtifact() {
      throw new Error("artifact updates are lazy");
    },
    async updateMarkdownArtifact() {
      throw new Error("artifact updates are lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    [
      "list_artifacts",
      "get_artifact",
      "create_markdown_artifact",
      "create_external_link_artifact",
      "create_pull_request_artifact",
      "update_artifact_metadata",
      "update_markdown_artifact",
      "update_external_link_artifact",
      "archive_artifact",
    ],
  );
});

test("AgentCreateMarkdownArtifactTool returns the persisted markdown artifact", async () => {
  const tool = new AgentCreateMarkdownArtifactTool({
    async createMarkdownArtifact() {
      return {
        id: "artifact-1",
        createdBySessionId: "session-1",
        sessionId: null,
        taskId: "task-1",
        scopeType: "task",
        type: "markdown_document",
        state: "active",
        name: "PRD",
        description: "Initial product requirements",
        markdownContent: "# PRD\n\nShip the feature.",
        url: null,
        pullRequestProvider: null,
        pullRequestRepository: null,
        pullRequestNumber: null,
        createdAt: new Date("2026-03-31T18:00:00.000Z"),
        updatedAt: new Date("2026-03-31T18:00:00.000Z"),
      };
    },
  } as never);

  const definition = tool.createDefinition();
  const result = await definition.execute("tool-call-1", {
    contentMarkdown: "# PRD\n\nShip the feature.",
    description: "Initial product requirements",
    name: "PRD",
    scopeType: "task",
    taskId: "task-1",
  }, undefined as never, undefined as never, undefined as never);

  assert.deepEqual(result, {
    content: [{
      text: [
        "artifactId: artifact-1",
        "scopeType: task",
        "taskId: task-1",
        "type: markdown_document",
        "state: active",
        "name: PRD",
        "description: Initial product requirements",
        "markdownContent:",
        "# PRD",
        "",
        "Ship the feature.",
        "createdAt: 2026-03-31T18:00:00.000Z",
        "updatedAt: 2026-03-31T18:00:00.000Z",
      ].join("\n"),
      type: "text",
    }],
    details: {
      artifactId: "artifact-1",
      type: "artifact",
    },
  });
});

test("AgentArchiveArtifactTool archives one artifact and reports the updated state", async () => {
  const tool = new AgentArchiveArtifactTool({
    async archiveArtifact() {
      return {
        id: "artifact-2",
        createdBySessionId: "session-1",
        sessionId: null,
        taskId: null,
        scopeType: "company",
        type: "external_link",
        state: "archived",
        name: "Live spec",
        description: null,
        markdownContent: null,
        url: "https://example.com/spec",
        pullRequestProvider: null,
        pullRequestRepository: null,
        pullRequestNumber: null,
        createdAt: new Date("2026-03-31T12:00:00.000Z"),
        updatedAt: new Date("2026-03-31T19:00:00.000Z"),
      };
    },
  } as never);

  const definition = tool.createDefinition();
  const result = await definition.execute("tool-call-1", {
    artifactId: "artifact-2",
  }, undefined as never, undefined as never, undefined as never);

  assert.deepEqual(result.details, {
    artifactId: "artifact-2",
    type: "artifact",
  });
  const content = result.content[0];
  assert.equal(content?.type, "text");
  assert.match(content.text, /state: archived/);
});

test("AgentArtifactToolService records creating and scoped sessions on pull request artifacts", async () => {
  const creationInputs: Array<{ createdBySessionId?: string | null; sessionId?: string | null }> = [];
  const service = new AgentArtifactToolService(
    {} as never,
    "company-1",
    "agent-1",
    "session-1",
    {
      async createPullRequestArtifact(
        _transactionProvider: unknown,
        input: { createdBySessionId?: string | null; sessionId?: string | null },
      ) {
        creationInputs.push(input);
        return {
          id: "artifact-3",
          createdBySessionId: input.createdBySessionId ?? null,
          sessionId: input.sessionId ?? null,
          taskId: null,
          scopeType: "session",
          type: "pull_request",
          state: "active",
          name: "Review PR",
          description: null,
          markdownContent: null,
          url: "https://github.com/company/repo/pull/42",
          pullRequestProvider: "github",
          pullRequestRepository: "company/repo",
          pullRequestNumber: 42,
          createdAt: new Date("2026-03-31T18:00:00.000Z"),
          updatedAt: new Date("2026-03-31T18:00:00.000Z"),
        };
      },
    } as never,
  );

  await service.createPullRequestArtifact({
    name: "Review PR",
    pullRequestNumber: 42,
    repository: "company/repo",
    scopeType: "session",
    url: "https://github.com/company/repo/pull/42",
  });

  assert.equal(creationInputs[0]?.createdBySessionId, "session-1");
  assert.equal(creationInputs[0]?.sessionId, "session-1");
});
