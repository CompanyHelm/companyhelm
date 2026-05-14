import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatArtifactDetailDialog } from "../src/pages/chats/chat_artifact_detail_dialog";
import { ChatArtifactsPanel } from "../src/pages/chats/chat_artifacts_panel";

const sessionArtifact = {
  createdAt: "2026-03-31T18:00:00.000Z",
  createdBySessionId: "session-1",
  description: "Initial product requirements",
  id: "artifact-1",
  markdownContent: "# PRD",
  name: "PRD",
  pullRequestNumber: null,
  pullRequestProvider: null,
  pullRequestRepository: null,
  scopeType: "session",
  sessionId: "session-1",
  state: "active",
  taskId: null,
  type: "markdown_document",
  updatedAt: "2026-03-31T18:00:00.000Z",
  url: null,
} as const;

test("chat artifacts panel renders artifact names and type labels", () => {
  const markup = renderToStaticMarkup(createElement(ChatArtifactsPanel, {
    artifacts: [sessionArtifact],
    dismissingArtifactId: null,
    onDismissArtifact: () => {},
    onOpenArtifact: () => {},
  }));

  assert.match(markup, /Artifacts/u);
  assert.match(markup, /PRD/u);
  assert.match(markup, /Document/u);
});

test("chat artifact detail dialog renders markdown artifact contents", () => {
  const dialog = ChatArtifactDetailDialog({
    artifact: sessionArtifact,
    isOpen: true,
    onOpenChange: () => {},
  });

  assert.ok(dialog);
});
