import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatListPanel } from "../src/pages/chats/chat_list_panel";
import type { AgentRecord, SessionArtifactRecord, SessionRecord } from "../src/pages/chats/chats_page_data";

const agent = {
  id: "agent-1",
  modelId: null,
  modelName: null,
  modelProvider: null,
  modelProviderCredentialModelId: null,
  name: "CEO",
  reasoningLevel: null,
} as AgentRecord;

const session = {
  agentId: "agent-1",
  associatedTask: null,
  associatedWorkflowRun: null,
  canForkLatestSession: false,
  createdAt: "2026-05-05T00:00:00.000Z",
  currentContextTokens: null,
  forkedFromSessionAgentId: null,
  forkedFromSessionId: null,
  forkedFromSessionTitle: null,
  forkedFromTurnId: null,
  hasUnread: false,
  id: "session-1",
  inferredTitle: "Execute the workflow",
  isCompacting: false,
  isThinking: false,
  lastUserMessageAt: null,
  maxContextTokens: null,
  modelId: null,
  modelProviderCredentialModelId: null,
  reasoningLevel: null,
  status: "idle",
  updatedAt: "2026-05-05T00:00:00.000Z",
  userSetTitle: null,
} as SessionRecord;

const unselectedSession = {
  ...session,
  id: "session-2",
  inferredTitle: "Spin up companyhelm locally",
} as SessionRecord;

const sessionArtifact = {
  createdAt: "2026-05-05T00:00:00.000Z",
  description: "Pull request for the session artifacts sidebar.",
  id: "artifact-1",
  markdownContent: null,
  name: "Session artifacts PR",
  pullRequestNumber: 123,
  pullRequestProvider: "github",
  pullRequestRepository: "CompanyHelm/companyhelm",
  scopeType: "session",
  sessionId: "session-1",
  state: "active",
  taskId: null,
  type: "pull_request",
  updatedAt: "2026-05-05T00:00:00.000Z",
  url: "https://github.com/CompanyHelm/companyhelm/pull/123",
} as SessionArtifactRecord;

test("chat list panel renders the selected session state in desktop mode", () => {
  const markup = renderToStaticMarkup(createElement(ChatListPanel, {
    archivingSessionId: null,
    chatListAgents: [agent],
    collapsedChatListAgentIds: {},
    dismissingArtifactId: null,
    isArchiveSessionInFlight: false,
    onArchiveSession: () => {},
    onDismissArtifact: () => {},
    onExpandAgent: () => {},
    onHideChatList: () => {},
    onOpenArtifact: () => {},
    onOpenDraftForAgent: () => {},
    onOpenNewChat: () => {},
    onOpenSession: () => {},
    onToggleAgentExpanded: () => {},
    organizationSlug: "companyhelm-local",
    panelMode: "desktop",
    selectedAgent: agent,
    selectedSession: session,
    selectedSessionArtifacts: [],
    sessionIdsWithOpenHumanQuestions: new Set<string>(),
    sessionTitleOverridesById: {},
    sessionsByAgentId: new Map([[agent.id, [session, unselectedSession]]]),
    sortedAgents: [agent],
  }));

  assert.match(markup, /transition bg-muted\/45/u);
  assert.match(markup, /transition bg-transparent hover:bg-muted\/30/u);
});

test("chat list panel hides the artifacts section when the selected session has no artifacts", () => {
  const markup = renderToStaticMarkup(createElement(ChatListPanel, {
    archivingSessionId: null,
    chatListAgents: [agent],
    collapsedChatListAgentIds: {},
    dismissingArtifactId: null,
    isArchiveSessionInFlight: false,
    onArchiveSession: () => {},
    onDismissArtifact: () => {},
    onExpandAgent: () => {},
    onHideChatList: () => {},
    onOpenArtifact: () => {},
    onOpenDraftForAgent: () => {},
    onOpenNewChat: () => {},
    onOpenSession: () => {},
    onToggleAgentExpanded: () => {},
    organizationSlug: "companyhelm-local",
    panelMode: "desktop",
    selectedAgent: agent,
    selectedSession: session,
    selectedSessionArtifacts: [],
    sessionIdsWithOpenHumanQuestions: new Set<string>(),
    sessionTitleOverridesById: {},
    sessionsByAgentId: new Map([[agent.id, [session]]]),
    sortedAgents: [agent],
  }));

  assert.doesNotMatch(markup, /Artifacts/u);
});

test("chat list panel renders session artifacts below the desktop chat list when artifacts exist", () => {
  const markup = renderToStaticMarkup(createElement(ChatListPanel, {
    archivingSessionId: null,
    chatListAgents: [agent],
    collapsedChatListAgentIds: {},
    dismissingArtifactId: null,
    isArchiveSessionInFlight: false,
    onArchiveSession: () => {},
    onDismissArtifact: () => {},
    onExpandAgent: () => {},
    onHideChatList: () => {},
    onOpenArtifact: () => {},
    onOpenDraftForAgent: () => {},
    onOpenNewChat: () => {},
    onOpenSession: () => {},
    onToggleAgentExpanded: () => {},
    organizationSlug: "companyhelm-local",
    panelMode: "desktop",
    selectedAgent: agent,
    selectedSession: session,
    selectedSessionArtifacts: [sessionArtifact],
    sessionIdsWithOpenHumanQuestions: new Set<string>(),
    sessionTitleOverridesById: {},
    sessionsByAgentId: new Map([[agent.id, [session]]]),
    sortedAgents: [agent],
  }));

  assert.match(markup, /Artifacts/u);
  assert.match(markup, /Session artifacts PR/u);
  assert.match(markup, /CompanyHelm\/companyhelm/u);
  assert.match(markup, /Dismiss Session artifacts PR/u);
});
