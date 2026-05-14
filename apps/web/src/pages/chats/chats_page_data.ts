import { graphql } from "react-relay";
import type { ChatComposerImageDraft } from "./chat_composer_image";
import type { chatsPageDataArchiveArtifactMutation } from "./__generated__/chatsPageDataArchiveArtifactMutation.graphql";
import type { chatsPageDataArchiveSessionMutation } from "./__generated__/chatsPageDataArchiveSessionMutation.graphql";
import type { chatsPageDataComposerSetupQuery } from "./__generated__/chatsPageDataComposerSetupQuery.graphql";
import type { chatsPageDataCreateSessionMutation } from "./__generated__/chatsPageDataCreateSessionMutation.graphql";
import type { chatsPageDataDeleteEnvironmentMutation } from "./__generated__/chatsPageDataDeleteEnvironmentMutation.graphql";
import type { chatsPageDataDeleteSessionQueuedMessageMutation } from "./__generated__/chatsPageDataDeleteSessionQueuedMessageMutation.graphql";
import type { chatsPageDataDetachSkillFromSessionMutation } from "./__generated__/chatsPageDataDetachSkillFromSessionMutation.graphql";
import type { chatsPageDataDismissInboxHumanQuestionMutation } from "./__generated__/chatsPageDataDismissInboxHumanQuestionMutation.graphql";
import type { chatsPageDataForkSessionMutation } from "./__generated__/chatsPageDataForkSessionMutation.graphql";
import type { chatsPageDataGetEnvironmentVncUrlMutation } from "./__generated__/chatsPageDataGetEnvironmentVncUrlMutation.graphql";
import type { chatsPageDataInboxHumanQuestionsUpdatedSubscription } from "./__generated__/chatsPageDataInboxHumanQuestionsUpdatedSubscription.graphql";
import type { chatsPageDataInterruptSessionMutation } from "./__generated__/chatsPageDataInterruptSessionMutation.graphql";
import type { chatsPageDataMarkSessionReadMutation } from "./__generated__/chatsPageDataMarkSessionReadMutation.graphql";
import type { chatsPageDataPromptSessionMutation } from "./__generated__/chatsPageDataPromptSessionMutation.graphql";
import type { chatsPageDataQuery } from "./__generated__/chatsPageDataQuery.graphql";
import type { chatsPageDataQueuedMessagesQuery } from "./__generated__/chatsPageDataQueuedMessagesQuery.graphql";
import type { chatsPageDataResolveInboxHumanQuestionMutation } from "./__generated__/chatsPageDataResolveInboxHumanQuestionMutation.graphql";
import type { chatsPageDataSelectedSessionArtifactsQuery } from "./__generated__/chatsPageDataSelectedSessionArtifactsQuery.graphql";
import type { chatsPageDataSessionEnvironmentQuery } from "./__generated__/chatsPageDataSessionEnvironmentQuery.graphql";
import type { chatsPageDataSessionArtifactsUpdatedSubscription } from "./__generated__/chatsPageDataSessionArtifactsUpdatedSubscription.graphql";
import type { chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription } from "./__generated__/chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription.graphql";
import type { chatsPageDataSessionMessageUpdatedSubscription } from "./__generated__/chatsPageDataSessionMessageUpdatedSubscription.graphql";
import type { chatsPageDataSessionQueuedMessagesUpdatedSubscription } from "./__generated__/chatsPageDataSessionQueuedMessagesUpdatedSubscription.graphql";
import type { chatsPageDataSessionUpdatedSubscription } from "./__generated__/chatsPageDataSessionUpdatedSubscription.graphql";
import type { chatsPageDataStartEnvironmentMutation } from "./__generated__/chatsPageDataStartEnvironmentMutation.graphql";
import type { chatsPageDataSteerSessionQueuedMessageMutation } from "./__generated__/chatsPageDataSteerSessionQueuedMessageMutation.graphql";
import type { chatsPageDataStopEnvironmentMutation } from "./__generated__/chatsPageDataStopEnvironmentMutation.graphql";
import type { chatsPageDataTranscriptQuery } from "./__generated__/chatsPageDataTranscriptQuery.graphql";
import type { chatsPageDataUpdateSessionTitleMutation } from "./__generated__/chatsPageDataUpdateSessionTitleMutation.graphql";

export const chatsPageDataChatListPanelAgentFragmentNode = graphql`
  fragment chatsPageDataChatListPanelAgentFragment on Agent {
    id
    name
    modelProviderCredentialModelId
    modelProvider
    modelName
    reasoningLevel
  }
`;

export const chatsPageDataChatListPanelSessionFragmentNode = graphql`
  fragment chatsPageDataChatListPanelSessionFragment on Session {
    id
    agentId
    associatedTask {
      id
      name
      status
    }
    associatedWorkflowRun {
      id
      workflowDefinitionId
      name
      status
      steps {
        id
        workflowRunId
        name
        ordinal
        status
      }
    }
    hasUnread
    inferredTitle
    status
    createdAt
    lastUserMessageAt
    userSetTitle
  }
`;

export const chatsPageDataChatComposerPaneSessionFragmentNode = graphql`
  fragment chatsPageDataChatComposerPaneSessionFragment on Session {
    id
    currentContextTokens
    isCompacting
    isThinking
    maxContextTokens
    status
  }
`;

export const chatsPageDataChatComposerPaneHumanQuestionFragmentNode = graphql`
  fragment chatsPageDataChatComposerPaneHumanQuestionFragment on InboxHumanQuestion {
    id
    sessionId
    title
    questionText
    allowCustomAnswer
    createdAt
    proposals {
      id
      answerText
      rating
    }
  }
`;

export const chatsPageDataChatTranscriptPaneSessionFragmentNode = graphql`
  fragment chatsPageDataChatTranscriptPaneSessionFragment on Session {
    id
    associatedTask {
      id
      name
      status
    }
    associatedWorkflowRun {
      id
      workflowDefinitionId
      name
      status
      steps {
        id
        workflowRunId
        name
        ordinal
        status
      }
    }
    forkedFromSessionAgentId
    forkedFromSessionId
    forkedFromSessionTitle
    forkedFromTurnId
    inferredTitle
    isCompacting
    status
    userSetTitle
  }
`;

export const chatsPageDataChatTranscriptPaneMessageFragmentNode = graphql`
  fragment chatsPageDataChatTranscriptPaneMessageFragment on SessionMessage {
    id
    sessionId
    turnId
    turn {
      id
      startedAt
      endedAt
    }
    role
    status
    toolCallId
    toolName
    principalType
    taskRunId
    workflowRunId
    contents {
      type
      text
      data
      mimeType
      structuredContent
      arguments
      toolCallId
      toolName
    }
    text
    isError
    errorMessage
    errorKind
    createdAt
    updatedAt
  }
`;

export const chatsPageQueryNode = graphql`
  query chatsPageDataQuery {
    Agents {
      ...chatsPageDataChatListPanelAgentFragment @relay(mask: false)
    }
    InboxHumanQuestions {
      ...chatsPageDataChatComposerPaneHumanQuestionFragment @relay(mask: false)
    }
    Sessions {
      ...chatsPageDataChatListPanelSessionFragment @relay(mask: false)
      ...chatsPageDataChatComposerPaneSessionFragment @relay(mask: false)
      ...chatsPageDataChatTranscriptPaneSessionFragment @relay(mask: false)
      canForkLatestSession
      forkedFromSessionAgentId
      forkedFromSessionId
      forkedFromSessionTitle
      forkedFromTurnId
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      updatedAt
    }
  }
`;

export const chatsPageComposerSetupQueryNode = graphql`
  query chatsPageDataComposerSetupQuery {
    AgentCreateOptions {
      id
      label
      modelProvider
      defaultModelId
      defaultReasoningLevel
      models {
        id
        modelProviderCredentialModelId
        modelId
        name
        description
        reasoningSupported
        reasoningLevels
      }
    }
  }
`;

export const chatsPageTranscriptQueryNode = graphql`
  query chatsPageDataTranscriptQuery($sessionId: ID!, $first: Int!, $after: String) {
    SessionTranscriptMessages(sessionId: $sessionId, first: $first, after: $after) {
      edges {
        cursor
        node {
          ...chatsPageDataChatTranscriptPaneMessageFragment @relay(mask: false)
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const chatsPageQueuedMessagesQueryNode = graphql`
  query chatsPageDataQueuedMessagesQuery($sessionId: ID!) {
    SessionQueuedMessages(sessionId: $sessionId) {
      id
      sessionId
      text
      images {
        id
        base64EncodedImage
        mimeType
      }
      shouldSteer
      status
      principalType
      createdAt
      updatedAt
    }
  }
`;

export const chatsPageSelectedSessionArtifactsQueryNode = graphql`
  query chatsPageDataSelectedSessionArtifactsQuery($sessionId: ID!) {
    Artifacts(input: { scopeType: "session", sessionId: $sessionId }) {
      id
      sessionId
      taskId
      scopeType
      type
      state
      name
      description
      markdownContent
      url
      pullRequestProvider
      pullRequestRepository
      pullRequestNumber
      createdAt
      updatedAt
    }
  }
`;

export const chatsPageSessionEnvironmentQueryNode = graphql`
  query chatsPageDataSessionEnvironmentQuery($sessionId: ID!) {
    SessionEnvironment(sessionId: $sessionId) {
      activeSkills {
        id
        name
        description
      }
      mcpWarnings {
        serverId
        serverName
        status
        errorMessage
        recommendedAction
      }
      currentEnvironment {
        id
        displayName
        provider
        providerDefinitionName
        providerEnvironmentId
        status
        platform
        cpuCount
        memoryGb
        diskSpaceGb
      }
      agentDefaultComputeProviderDefinition {
        id
        name
        provider
      }
    }
  }
`;

export const chatsPageArchiveArtifactMutationNode = graphql`
  mutation chatsPageDataArchiveArtifactMutation($input: ArchiveArtifactInput!) {
    ArchiveArtifact(input: $input) {
      id
      sessionId
      taskId
      scopeType
      type
      state
      name
      description
      markdownContent
      url
      pullRequestProvider
      pullRequestRepository
      pullRequestNumber
      createdAt
      updatedAt
    }
  }
`;

export const chatsPageDetachSkillFromSessionMutationNode = graphql`
  mutation chatsPageDataDetachSkillFromSessionMutation($input: DetachSkillFromSessionInput!) {
    DetachSkillFromSession(input: $input) {
      id
      name
      description
    }
  }
`;

export const chatsPageDeleteEnvironmentMutationNode = graphql`
  mutation chatsPageDataDeleteEnvironmentMutation($input: DeleteEnvironmentInput!) {
    DeleteEnvironment(input: $input) {
      id
    }
  }
`;

export const chatsPageStartEnvironmentMutationNode = graphql`
  mutation chatsPageDataStartEnvironmentMutation($input: StartEnvironmentInput!) {
    StartEnvironment(input: $input) {
      id
    }
  }
`;

export const chatsPageGetEnvironmentVncUrlMutationNode = graphql`
  mutation chatsPageDataGetEnvironmentVncUrlMutation($input: GetEnvironmentVncUrlInput!) {
    GetEnvironmentVncUrl(input: $input) {
      url
    }
  }
`;

export const chatsPageStopEnvironmentMutationNode = graphql`
  mutation chatsPageDataStopEnvironmentMutation($input: StopEnvironmentInput!) {
    StopEnvironment(input: $input) {
      id
    }
  }
`;

export const chatsPageDeleteSessionQueuedMessageMutationNode = graphql`
  mutation chatsPageDataDeleteSessionQueuedMessageMutation($input: DeleteSessionQueuedMessageInput!) {
    DeleteSessionQueuedMessage(input: $input) {
      id
      sessionId
      shouldSteer
      status
      updatedAt
    }
  }
`;

export const chatsPageSteerSessionQueuedMessageMutationNode = graphql`
  mutation chatsPageDataSteerSessionQueuedMessageMutation($input: SteerSessionQueuedMessageInput!) {
    SteerSessionQueuedMessage(input: $input) {
      id
      sessionId
      shouldSteer
      status
      updatedAt
    }
  }
`;

export const chatsPageCreateSessionMutationNode = graphql`
  mutation chatsPageDataCreateSessionMutation($input: CreateSessionInput!) {
    CreateSession(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      forkedFromSessionAgentId
      forkedFromSessionId
      forkedFromSessionTitle
      forkedFromTurnId
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      createdAt
      updatedAt
      lastUserMessageAt
      userSetTitle
    }
  }
`;

export const chatsPageForkSessionMutationNode = graphql`
  mutation chatsPageDataForkSessionMutation($input: ForkSessionInput!) {
    ForkSession(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      forkedFromSessionAgentId
      forkedFromSessionId
      forkedFromSessionTitle
      forkedFromTurnId
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      createdAt
      updatedAt
      lastUserMessageAt
      userSetTitle
    }
  }
`;

export const chatsPageArchiveSessionMutationNode = graphql`
  mutation chatsPageDataArchiveSessionMutation($input: ArchiveSessionInput!) {
    ArchiveSession(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      forkedFromSessionAgentId
      forkedFromSessionId
      forkedFromSessionTitle
      forkedFromTurnId
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      createdAt
      updatedAt
      lastUserMessageAt
      userSetTitle
    }
  }
`;

export const chatsPagePromptSessionMutationNode = graphql`
  mutation chatsPageDataPromptSessionMutation($input: PromptSessionInput!) {
    PromptSession(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      forkedFromSessionAgentId
      forkedFromSessionId
      forkedFromSessionTitle
      forkedFromTurnId
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      createdAt
      updatedAt
      lastUserMessageAt
      userSetTitle
    }
  }
`;

export const chatsPageInterruptSessionMutationNode = graphql`
  mutation chatsPageDataInterruptSessionMutation($input: InterruptSessionInput!) {
    InterruptSession(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      forkedFromSessionAgentId
      forkedFromSessionId
      forkedFromSessionTitle
      forkedFromTurnId
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      createdAt
      updatedAt
      lastUserMessageAt
      userSetTitle
    }
  }
`;

export const chatsPageResolveInboxHumanQuestionMutationNode = graphql`
  mutation chatsPageDataResolveInboxHumanQuestionMutation($input: ResolveInboxHumanQuestionInput!) {
    ResolveInboxHumanQuestion(input: $input) {
      id
    }
  }
`;

export const chatsPageDismissInboxHumanQuestionMutationNode = graphql`
  mutation chatsPageDataDismissInboxHumanQuestionMutation($input: DismissInboxHumanQuestionInput!) {
    DismissInboxHumanQuestion(input: $input) {
      id
    }
  }
`;

export const chatsPageMarkSessionReadMutationNode = graphql`
  mutation chatsPageDataMarkSessionReadMutation($input: MarkSessionReadInput!) {
    MarkSessionRead(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      forkedFromSessionAgentId
      forkedFromSessionId
      forkedFromSessionTitle
      forkedFromTurnId
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      createdAt
      updatedAt
      lastUserMessageAt
      userSetTitle
    }
  }
`;

export const chatsPageUpdateSessionTitleMutationNode = graphql`
  mutation chatsPageDataUpdateSessionTitleMutation($input: UpdateSessionTitleInput!) {
    UpdateSessionTitle(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      forkedFromSessionAgentId
      forkedFromSessionId
      forkedFromSessionTitle
      forkedFromTurnId
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      createdAt
      updatedAt
      lastUserMessageAt
      userSetTitle
    }
  }
`;

export const chatsPageSessionUpdatedSubscriptionNode = graphql`
  subscription chatsPageDataSessionUpdatedSubscription {
    SessionUpdated {
      ...chatsPageDataChatListPanelSessionFragment @relay(mask: false)
      ...chatsPageDataChatComposerPaneSessionFragment @relay(mask: false)
      ...chatsPageDataChatTranscriptPaneSessionFragment @relay(mask: false)
      canForkLatestSession
      forkedFromSessionAgentId
      forkedFromSessionId
      forkedFromSessionTitle
      forkedFromTurnId
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      updatedAt
    }
  }
`;

export const chatsPageSessionInboxHumanQuestionsUpdatedSubscriptionNode = graphql`
  subscription chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription($sessionId: ID!) {
    SessionInboxHumanQuestionsUpdated(sessionId: $sessionId) {
      ...chatsPageDataChatComposerPaneHumanQuestionFragment @relay(mask: false)
    }
  }
`;

export const chatsPageInboxHumanQuestionsUpdatedSubscriptionNode = graphql`
  subscription chatsPageDataInboxHumanQuestionsUpdatedSubscription {
    InboxHumanQuestionsUpdated {
      ...chatsPageDataChatComposerPaneHumanQuestionFragment @relay(mask: false)
    }
  }
`;

export const chatsPageSessionQueuedMessagesUpdatedSubscriptionNode = graphql`
  subscription chatsPageDataSessionQueuedMessagesUpdatedSubscription($sessionId: ID!) {
    SessionQueuedMessagesUpdated(sessionId: $sessionId) {
      id
      sessionId
      text
      images {
        id
        base64EncodedImage
        mimeType
      }
      shouldSteer
      status
      principalType
      createdAt
      updatedAt
    }
  }
`;

export const chatsPageSessionArtifactsUpdatedSubscriptionNode = graphql`
  subscription chatsPageDataSessionArtifactsUpdatedSubscription($sessionId: ID!) {
    SessionArtifactsUpdated(sessionId: $sessionId) {
      id
      sessionId
      taskId
      scopeType
      type
      state
      name
      description
      markdownContent
      url
      pullRequestProvider
      pullRequestRepository
      pullRequestNumber
      createdAt
      updatedAt
    }
  }
`;

export const chatsPageSessionMessageUpdatedSubscriptionNode = graphql`
  subscription chatsPageDataSessionMessageUpdatedSubscription($sessionId: ID!) {
    SessionMessageUpdated(sessionId: $sessionId) {
      ...chatsPageDataChatTranscriptPaneMessageFragment @relay(mask: false)
    }
  }
`;

export type ChatsPageArchiveArtifactMutation = chatsPageDataArchiveArtifactMutation;
export type ChatsPageArchiveSessionMutation = chatsPageDataArchiveSessionMutation;
export type ChatsPageComposerSetupQuery = chatsPageDataComposerSetupQuery;
export type ChatsPageCreateSessionMutation = chatsPageDataCreateSessionMutation;
export type ChatsPageDeleteEnvironmentMutation = chatsPageDataDeleteEnvironmentMutation;
export type ChatsPageDeleteSessionQueuedMessageMutation = chatsPageDataDeleteSessionQueuedMessageMutation;
export type ChatsPageDetachSkillFromSessionMutation = chatsPageDataDetachSkillFromSessionMutation;
export type ChatsPageDismissInboxHumanQuestionMutation = chatsPageDataDismissInboxHumanQuestionMutation;
export type ChatsPageForkSessionMutation = chatsPageDataForkSessionMutation;
export type ChatsPageGetEnvironmentVncUrlMutation = chatsPageDataGetEnvironmentVncUrlMutation;
export type ChatsPageInboxHumanQuestionsUpdatedSubscription = chatsPageDataInboxHumanQuestionsUpdatedSubscription;
export type ChatsPageInterruptSessionMutation = chatsPageDataInterruptSessionMutation;
export type ChatsPageMarkSessionReadMutation = chatsPageDataMarkSessionReadMutation;
export type ChatsPagePromptSessionMutation = chatsPageDataPromptSessionMutation;
export type ChatsPageQueuedMessagesQuery = chatsPageDataQueuedMessagesQuery;
export type ChatsPageQuery = chatsPageDataQuery;
export type ChatsPageResolveInboxHumanQuestionMutation = chatsPageDataResolveInboxHumanQuestionMutation;
export type ChatsPageSelectedSessionArtifactsQuery = chatsPageDataSelectedSessionArtifactsQuery;
export type ChatsPageSessionEnvironmentQuery = chatsPageDataSessionEnvironmentQuery;
export type ChatsPageSessionArtifactsUpdatedSubscription = chatsPageDataSessionArtifactsUpdatedSubscription;
export type ChatsPageSessionInboxHumanQuestionsUpdatedSubscription = chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription;
export type ChatsPageSessionMessageUpdatedSubscription = chatsPageDataSessionMessageUpdatedSubscription;
export type ChatsPageSessionQueuedMessagesUpdatedSubscription = chatsPageDataSessionQueuedMessagesUpdatedSubscription;
export type ChatsPageSessionUpdatedSubscription = chatsPageDataSessionUpdatedSubscription;
export type ChatsPageStartEnvironmentMutation = chatsPageDataStartEnvironmentMutation;
export type ChatsPageSteerSessionQueuedMessageMutation = chatsPageDataSteerSessionQueuedMessageMutation;
export type ChatsPageStopEnvironmentMutation = chatsPageDataStopEnvironmentMutation;
export type ChatsPageTranscriptQuery = chatsPageDataTranscriptQuery;
export type ChatsPageUpdateSessionTitleMutation = chatsPageDataUpdateSessionTitleMutation;

export type ProviderOptionRecord = chatsPageDataComposerSetupQuery["response"]["AgentCreateOptions"][number];
export type AgentRecord = chatsPageDataQuery["response"]["Agents"][number];
export type InboxHumanQuestionRecord = chatsPageDataQuery["response"]["InboxHumanQuestions"][number];
export type QueuedMessageRecord = chatsPageDataQueuedMessagesQuery["response"]["SessionQueuedMessages"][number];
export type SessionRecord = chatsPageDataQuery["response"]["Sessions"][number];
export type SessionTranscriptConnection = chatsPageDataTranscriptQuery["response"]["SessionTranscriptMessages"];
export type SessionTranscriptEdgeRecord = SessionTranscriptConnection["edges"][number];
export type SessionMessageRecord = SessionTranscriptEdgeRecord["node"];
export type SessionMessageContentRecord = SessionMessageRecord["contents"][number];
export type SessionEnvironmentInfoRecord = chatsPageDataSessionEnvironmentQuery["response"]["SessionEnvironment"];
export type SessionArtifactRecord = chatsPageDataSelectedSessionArtifactsQuery["response"]["Artifacts"][number];
export type SessionEnvironmentActiveSkillRecord = SessionEnvironmentInfoRecord["activeSkills"][number];
export type DraftComposerImageRecord = ChatComposerImageDraft;
export type ChatsPageSearch = {
  agentId?: string;
  sessionId?: string;
};
