import { Suspense, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import { ConversationList, type ConversationListRecord } from "./conversation_list";
import {
  ConversationTranscript,
  type ConversationMessageRecord,
} from "./conversation_transcript";
import type { conversationsPageListQuery } from "./__generated__/conversationsPageListQuery.graphql";
import type { conversationsPageMessagesQuery } from "./__generated__/conversationsPageMessagesQuery.graphql";

type ConversationsPageSearch = {
  conversationId?: string;
};

const conversationsPageListQueryNode = graphql`
  query conversationsPageListQuery {
    AgentConversations {
      id
      latestMessagePreview
      latestMessageAt
      createdAt
      updatedAt
      participants {
        id
        agentId
        agentName
        sessionId
        sessionTitle
      }
    }
  }
`;

const conversationsPageMessagesQueryNode = graphql`
  query conversationsPageMessagesQuery($conversationId: ID) {
    AgentConversationMessages(conversationId: $conversationId) {
      id
      conversationId
      authorParticipantId
      authorAgentId
      authorAgentName
      authorSessionId
      authorSessionTitle
      text
      createdAt
    }
  }
`;

function ConversationsPageFallback() {
  return (
    <main className="grid flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="min-h-[420px] rounded-2xl border border-border/60 bg-card" />
      <div className="min-h-[420px] rounded-2xl border border-border/60 bg-card" />
    </main>
  );
}

function ConversationsPageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as ConversationsPageSearch;
  const listData = useLazyLoadQuery<conversationsPageListQuery>(
    conversationsPageListQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );

  const conversations: ConversationListRecord[] = listData.AgentConversations.map((conversation) => ({
    createdAt: conversation.createdAt,
    id: conversation.id,
    latestMessageAt: conversation.latestMessageAt,
    latestMessagePreview: conversation.latestMessagePreview,
    participants: conversation.participants.map((participant) => ({
      agentId: participant.agentId,
      agentName: participant.agentName,
      id: participant.id,
      sessionId: participant.sessionId,
      sessionTitle: participant.sessionTitle,
    })),
    updatedAt: conversation.updatedAt,
  }));
  const selectedConversationId = conversations.some((conversation) => conversation.id === search.conversationId)
    ? search.conversationId
    : conversations[0]?.id;
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const messagesData = useLazyLoadQuery<conversationsPageMessagesQuery>(
    conversationsPageMessagesQueryNode,
    {
      conversationId: selectedConversationId ?? null,
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const messages: ConversationMessageRecord[] = selectedConversationId
    ? messagesData.AgentConversationMessages.map((message) => ({
      authorAgentId: message.authorAgentId,
      authorAgentName: message.authorAgentName,
      authorParticipantId: message.authorParticipantId,
      authorSessionId: message.authorSessionId,
      authorSessionTitle: message.authorSessionTitle,
      conversationId: message.conversationId,
      createdAt: message.createdAt,
      id: message.id,
      text: message.text,
    }))
    : [];

  useEffect(() => {
    if (!selectedConversationId || selectedConversationId === search.conversationId) {
      return;
    }

    void navigate({
      replace: true,
      search: {
        conversationId: selectedConversationId,
      },
      to: "/conversations",
    });
  }, [navigate, search.conversationId, selectedConversationId]);

  return (
    <main className="grid flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <ConversationList
        conversations={conversations}
        onSelect={(conversationId) => {
          void navigate({
            search: {
              conversationId,
            },
            to: "/conversations",
          });
        }}
        selectedConversationId={selectedConversationId}
      />
      <ConversationTranscript
        conversation={selectedConversation}
        messages={messages}
      />
    </main>
  );
}

export function ConversationsPage() {
  return (
    <Suspense fallback={<ConversationsPageFallback />}>
      <ConversationsPageContent />
    </Suspense>
  );
}
