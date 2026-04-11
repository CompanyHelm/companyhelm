import { graphql } from "react-relay";
import type { ChatComposerImageDraft } from "./chat_composer_image";
import type { chatsPageArchiveSessionMutation } from "./__generated__/chatsPageArchiveSessionMutation.graphql";
import type { chatsPageCreateSessionMutation } from "./__generated__/chatsPageCreateSessionMutation.graphql";
import type { chatsPageDeleteEnvironmentMutation } from "./__generated__/chatsPageDeleteEnvironmentMutation.graphql";
import type { chatsPageDeleteSessionQueuedMessageMutation } from "./__generated__/chatsPageDeleteSessionQueuedMessageMutation.graphql";
import type { chatsPageDismissInboxHumanQuestionMutation } from "./__generated__/chatsPageDismissInboxHumanQuestionMutation.graphql";
import type { chatsPageForkSessionMutation } from "./__generated__/chatsPageForkSessionMutation.graphql";
import type { chatsPageGetEnvironmentVncUrlMutation } from "./__generated__/chatsPageGetEnvironmentVncUrlMutation.graphql";
import type { chatsPageInboxHumanQuestionsUpdatedSubscription } from "./__generated__/chatsPageInboxHumanQuestionsUpdatedSubscription.graphql";
import type { chatsPageInterruptSessionMutation } from "./__generated__/chatsPageInterruptSessionMutation.graphql";
import type { chatsPageMarkSessionReadMutation } from "./__generated__/chatsPageMarkSessionReadMutation.graphql";
import type { chatsPagePromptSessionMutation } from "./__generated__/chatsPagePromptSessionMutation.graphql";
import type { chatsPageQueuedMessagesQuery } from "./__generated__/chatsPageQueuedMessagesQuery.graphql";
import type { chatsPageQuery } from "./__generated__/chatsPageQuery.graphql";
import type { chatsPageResolveInboxHumanQuestionMutation } from "./__generated__/chatsPageResolveInboxHumanQuestionMutation.graphql";
import type { chatsPageSessionEnvironmentQuery } from "./__generated__/chatsPageSessionEnvironmentQuery.graphql";
import type { chatsPageSessionInboxHumanQuestionsUpdatedSubscription } from "./__generated__/chatsPageSessionInboxHumanQuestionsUpdatedSubscription.graphql";
import type { chatsPageSessionMessageUpdatedSubscription } from "./__generated__/chatsPageSessionMessageUpdatedSubscription.graphql";
import type { chatsPageSessionQueuedMessagesUpdatedSubscription } from "./__generated__/chatsPageSessionQueuedMessagesUpdatedSubscription.graphql";
import type { chatsPageSessionUpdatedSubscription } from "./__generated__/chatsPageSessionUpdatedSubscription.graphql";
import type { chatsPageStartEnvironmentMutation } from "./__generated__/chatsPageStartEnvironmentMutation.graphql";
import type { chatsPageSteerSessionQueuedMessageMutation } from "./__generated__/chatsPageSteerSessionQueuedMessageMutation.graphql";
import type { chatsPageStopEnvironmentMutation } from "./__generated__/chatsPageStopEnvironmentMutation.graphql";
import type { chatsPageTranscriptQuery } from "./__generated__/chatsPageTranscriptQuery.graphql";
import type { chatsPageUpdateSessionTitleMutation } from "./__generated__/chatsPageUpdateSessionTitleMutation.graphql";

export const chatsPageQueryNode = graphql`
  query chatsPageQuery {
    Agents {
      id
      name
      modelProviderCredentialId
      modelProviderCredentialModelId
      modelProvider
      modelName
      reasoningLevel
    }
    AgentCreateOptions {
      id
      label
      modelProvider
      defaultModelId
      defaultReasoningLevel
      models {
        id
        modelId
        name
        description
        reasoningSupported
        reasoningLevels
      }
    }
    InboxHumanQuestions {
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
    Sessions {
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
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

export const chatsPageTranscriptQueryNode = graphql`
  query chatsPageTranscriptQuery($sessionId: ID!, $first: Int!, $after: String) {
    SessionTranscriptMessages(sessionId: $sessionId, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          sessionId
          turnId
          turn {
            id
            sessionId
            startedAt
            endedAt
          }
          role
          status
          toolCallId
          toolName
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
          createdAt
          updatedAt
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
  query chatsPageQueuedMessagesQuery($sessionId: ID!) {
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
      createdAt
      updatedAt
    }
  }
`;

export const chatsPageSessionEnvironmentQueryNode = graphql`
  query chatsPageSessionEnvironmentQuery($sessionId: ID!) {
    SessionEnvironment(sessionId: $sessionId) {
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

export const chatsPageDeleteEnvironmentMutationNode = graphql`
  mutation chatsPageDeleteEnvironmentMutation($input: DeleteEnvironmentInput!) {
    DeleteEnvironment(input: $input) {
      id
    }
  }
`;

export const chatsPageStartEnvironmentMutationNode = graphql`
  mutation chatsPageStartEnvironmentMutation($input: StartEnvironmentInput!) {
    StartEnvironment(input: $input) {
      id
    }
  }
`;

export const chatsPageGetEnvironmentVncUrlMutationNode = graphql`
  mutation chatsPageGetEnvironmentVncUrlMutation($input: GetEnvironmentVncUrlInput!) {
    GetEnvironmentVncUrl(input: $input) {
      url
    }
  }
`;

export const chatsPageStopEnvironmentMutationNode = graphql`
  mutation chatsPageStopEnvironmentMutation($input: StopEnvironmentInput!) {
    StopEnvironment(input: $input) {
      id
    }
  }
`;

export const chatsPageDeleteSessionQueuedMessageMutationNode = graphql`
  mutation chatsPageDeleteSessionQueuedMessageMutation($input: DeleteSessionQueuedMessageInput!) {
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
  mutation chatsPageSteerSessionQueuedMessageMutation($input: SteerSessionQueuedMessageInput!) {
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
  mutation chatsPageCreateSessionMutation($input: CreateSessionInput!) {
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
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

export const chatsPageForkSessionMutationNode = graphql`
  mutation chatsPageForkSessionMutation($input: ForkSessionInput!) {
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
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

export const chatsPageArchiveSessionMutationNode = graphql`
  mutation chatsPageArchiveSessionMutation($input: ArchiveSessionInput!) {
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
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

export const chatsPagePromptSessionMutationNode = graphql`
  mutation chatsPagePromptSessionMutation($input: PromptSessionInput!) {
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
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

export const chatsPageInterruptSessionMutationNode = graphql`
  mutation chatsPageInterruptSessionMutation($input: InterruptSessionInput!) {
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
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

export const chatsPageResolveInboxHumanQuestionMutationNode = graphql`
  mutation chatsPageResolveInboxHumanQuestionMutation($input: ResolveInboxHumanQuestionInput!) {
    ResolveInboxHumanQuestion(input: $input) {
      id
    }
  }
`;

export const chatsPageDismissInboxHumanQuestionMutationNode = graphql`
  mutation chatsPageDismissInboxHumanQuestionMutation($input: DismissInboxHumanQuestionInput!) {
    DismissInboxHumanQuestion(input: $input) {
      id
    }
  }
`;

export const chatsPageMarkSessionReadMutationNode = graphql`
  mutation chatsPageMarkSessionReadMutation($input: MarkSessionReadInput!) {
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
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

export const chatsPageUpdateSessionTitleMutationNode = graphql`
  mutation chatsPageUpdateSessionTitleMutation($input: UpdateSessionTitleInput!) {
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
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

export const chatsPageSessionUpdatedSubscriptionNode = graphql`
  subscription chatsPageSessionUpdatedSubscription {
    SessionUpdated {
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
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

export const chatsPageSessionInboxHumanQuestionsUpdatedSubscriptionNode = graphql`
  subscription chatsPageSessionInboxHumanQuestionsUpdatedSubscription($sessionId: ID!) {
    SessionInboxHumanQuestionsUpdated(sessionId: $sessionId) {
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
  }
`;

export const chatsPageInboxHumanQuestionsUpdatedSubscriptionNode = graphql`
  subscription chatsPageInboxHumanQuestionsUpdatedSubscription {
    InboxHumanQuestionsUpdated {
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
  }
`;

export const chatsPageSessionQueuedMessagesUpdatedSubscriptionNode = graphql`
  subscription chatsPageSessionQueuedMessagesUpdatedSubscription($sessionId: ID!) {
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
      createdAt
      updatedAt
    }
  }
`;

export const chatsPageSessionMessageUpdatedSubscriptionNode = graphql`
  subscription chatsPageSessionMessageUpdatedSubscription($sessionId: ID!) {
    SessionMessageUpdated(sessionId: $sessionId) {
      id
      sessionId
      turnId
      turn {
        id
        sessionId
        startedAt
        endedAt
      }
      role
      status
      toolCallId
      toolName
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
      createdAt
      updatedAt
    }
  }
`;

export type ChatsPageArchiveSessionMutation = chatsPageArchiveSessionMutation;
export type ChatsPageCreateSessionMutation = chatsPageCreateSessionMutation;
export type ChatsPageDeleteEnvironmentMutation = chatsPageDeleteEnvironmentMutation;
export type ChatsPageDeleteSessionQueuedMessageMutation = chatsPageDeleteSessionQueuedMessageMutation;
export type ChatsPageDismissInboxHumanQuestionMutation = chatsPageDismissInboxHumanQuestionMutation;
export type ChatsPageForkSessionMutation = chatsPageForkSessionMutation;
export type ChatsPageGetEnvironmentVncUrlMutation = chatsPageGetEnvironmentVncUrlMutation;
export type ChatsPageInboxHumanQuestionsUpdatedSubscription = chatsPageInboxHumanQuestionsUpdatedSubscription;
export type ChatsPageInterruptSessionMutation = chatsPageInterruptSessionMutation;
export type ChatsPageMarkSessionReadMutation = chatsPageMarkSessionReadMutation;
export type ChatsPagePromptSessionMutation = chatsPagePromptSessionMutation;
export type ChatsPageQueuedMessagesQuery = chatsPageQueuedMessagesQuery;
export type ChatsPageQuery = chatsPageQuery;
export type ChatsPageResolveInboxHumanQuestionMutation = chatsPageResolveInboxHumanQuestionMutation;
export type ChatsPageSessionEnvironmentQuery = chatsPageSessionEnvironmentQuery;
export type ChatsPageSessionInboxHumanQuestionsUpdatedSubscription = chatsPageSessionInboxHumanQuestionsUpdatedSubscription;
export type ChatsPageSessionMessageUpdatedSubscription = chatsPageSessionMessageUpdatedSubscription;
export type ChatsPageSessionQueuedMessagesUpdatedSubscription = chatsPageSessionQueuedMessagesUpdatedSubscription;
export type ChatsPageSessionUpdatedSubscription = chatsPageSessionUpdatedSubscription;
export type ChatsPageStartEnvironmentMutation = chatsPageStartEnvironmentMutation;
export type ChatsPageSteerSessionQueuedMessageMutation = chatsPageSteerSessionQueuedMessageMutation;
export type ChatsPageStopEnvironmentMutation = chatsPageStopEnvironmentMutation;
export type ChatsPageTranscriptQuery = chatsPageTranscriptQuery;
export type ChatsPageUpdateSessionTitleMutation = chatsPageUpdateSessionTitleMutation;

export type ProviderOptionRecord = chatsPageQuery["response"]["AgentCreateOptions"][number];
export type AgentRecord = chatsPageQuery["response"]["Agents"][number];
export type InboxHumanQuestionRecord = chatsPageQuery["response"]["InboxHumanQuestions"][number];
export type QueuedMessageRecord = chatsPageQueuedMessagesQuery["response"]["SessionQueuedMessages"][number];
export type SessionRecord = chatsPageQuery["response"]["Sessions"][number];
export type SessionTranscriptConnection = chatsPageTranscriptQuery["response"]["SessionTranscriptMessages"];
export type SessionTranscriptEdgeRecord = SessionTranscriptConnection["edges"][number];
export type SessionMessageRecord = SessionTranscriptEdgeRecord["node"];
export type SessionMessageContentRecord = SessionMessageRecord["contents"][number];
export type SessionEnvironmentInfoRecord = chatsPageSessionEnvironmentQuery["response"]["SessionEnvironment"];
export type DraftComposerImageRecord = ChatComposerImageDraft;
export type ChatsPageSearch = {
  agentId?: string;
  sessionId?: string;
};
