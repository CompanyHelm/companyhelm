import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { SecretEncryptionService } from "../../services/secrets/encryption.ts";
import { SecretService } from "../../services/secrets/service.ts";
import { ArchiveSessionMutation } from "../mutations/archive_session.ts";
import { AttachSecretToSessionMutation } from "../mutations/attach_secret_to_session.ts";
import { CreateSessionMutation } from "../mutations/create_session.ts";
import { DeleteAgentConversationMutation } from "../mutations/delete_agent_conversation.ts";
import { DeleteSessionMutation } from "../mutations/delete_session.ts";
import { DeleteSessionQueuedMessageMutation } from "../mutations/delete_session_queued_message.ts";
import { DismissInboxHumanQuestionMutation } from "../mutations/dismiss_inbox_human_question.ts";
import { DetachSecretFromSessionMutation } from "../mutations/detach_secret_from_session.ts";
import { DetachSkillFromSessionMutation } from "../mutations/detach_skill_from_session.ts";
import { ForkSessionMutation } from "../mutations/fork_session.ts";
import { InterruptSessionMutation } from "../mutations/interrupt_session.ts";
import { MarkSessionReadMutation } from "../mutations/mark_session_read.ts";
import { PromptSessionMutation } from "../mutations/prompt_session.ts";
import { ResolveInboxHumanQuestionMutation } from "../mutations/resolve_inbox_human_question.ts";
import { SteerSessionQueuedMessageMutation } from "../mutations/steer_session_queued_message.ts";
import { UnarchiveSessionMutation } from "../mutations/unarchive_session.ts";
import { UpdateSessionTitleMutation } from "../mutations/update_session_title.ts";
import { AgentConversationMessagesQueryResolver } from "../resolvers/agent_conversation_messages.ts";
import { AgentConversationsQueryResolver } from "../resolvers/agent_conversations.ts";
import { InboxHumanQuestionsQueryResolver } from "../resolvers/inbox_human_questions.ts";
import { InboxHumanQuestionsUpdatedSubscriptionResolver } from "../resolvers/inbox_human_questions_updated.ts";
import { SessionInboxHumanQuestionsUpdatedSubscriptionResolver } from "../resolvers/session_inbox_human_questions_updated.ts";
import { SessionMessageUpdatedSubscriptionResolver } from "../resolvers/session_message_updated.ts";
import { SessionMessagesQueryResolver } from "../resolvers/session_messages.ts";
import { SessionQueuedMessagesQueryResolver } from "../resolvers/session_queued_messages.ts";
import { SessionQueuedMessagesUpdatedSubscriptionResolver } from "../resolvers/session_queued_messages_updated.ts";
import { SessionSecretsQueryResolver } from "../resolvers/session_secrets.ts";
import { SessionsQueryResolver } from "../resolvers/sessions.ts";
import { SessionTranscriptMessagesQueryResolver } from "../resolvers/session_transcript_messages.ts";
import { SessionUpdatedSubscriptionResolver } from "../resolvers/session_updated.ts";
import type { GraphqlResolverFragment, GraphqlRegistryInterface } from "./graphql_registry_interface.ts";

type ArchiveSessionMutationLike = {
  execute: (...arguments_: unknown[]) => unknown;
};

type UpdateSessionTitleMutationLike = {
  execute: (...arguments_: unknown[]) => unknown;
};

/**
 * Owns the session, conversation, and inbox resolver surface so the transport layer no longer
 * needs to know about the full set of session mutations and subscriptions.
 */
@injectable()
export class ConversationGraphqlRegistry implements GraphqlRegistryInterface {
  private readonly agentConversationMessagesQueryResolver: AgentConversationMessagesQueryResolver;
  private readonly agentConversationsQueryResolver: AgentConversationsQueryResolver;
  private archiveSessionMutation: ArchiveSessionMutationLike;
  private readonly attachSecretToSessionMutation: AttachSecretToSessionMutation;
  private readonly createSessionMutation: CreateSessionMutation;
  private readonly deleteAgentConversationMutation: DeleteAgentConversationMutation;
  private readonly deleteSessionMutation: DeleteSessionMutation;
  private readonly deleteSessionQueuedMessageMutation: DeleteSessionQueuedMessageMutation;
  private readonly dismissInboxHumanQuestionMutation: DismissInboxHumanQuestionMutation;
  private readonly detachSecretFromSessionMutation: DetachSecretFromSessionMutation;
  private readonly detachSkillFromSessionMutation: DetachSkillFromSessionMutation;
  private readonly forkSessionMutation: ForkSessionMutation;
  private readonly inboxHumanQuestionsQueryResolver: InboxHumanQuestionsQueryResolver;
  private readonly inboxHumanQuestionsUpdatedSubscriptionResolver: InboxHumanQuestionsUpdatedSubscriptionResolver;
  private readonly interruptSessionMutation: InterruptSessionMutation;
  private readonly markSessionReadMutation: MarkSessionReadMutation;
  private readonly promptSessionMutation: PromptSessionMutation;
  private readonly resolveInboxHumanQuestionMutation: ResolveInboxHumanQuestionMutation;
  private readonly sessionMessagesQueryResolver: SessionMessagesQueryResolver;
  private readonly sessionInboxHumanQuestionsUpdatedSubscriptionResolver: SessionInboxHumanQuestionsUpdatedSubscriptionResolver;
  private readonly sessionQueuedMessagesQueryResolver: SessionQueuedMessagesQueryResolver;
  private readonly sessionMessageUpdatedSubscriptionResolver: SessionMessageUpdatedSubscriptionResolver;
  private readonly sessionQueuedMessagesUpdatedSubscriptionResolver: SessionQueuedMessagesUpdatedSubscriptionResolver;
  private readonly sessionSecretsQueryResolver: SessionSecretsQueryResolver;
  private readonly sessionTranscriptMessagesQueryResolver: SessionTranscriptMessagesQueryResolver;
  private readonly sessionsQueryResolver: SessionsQueryResolver;
  private readonly sessionUpdatedSubscriptionResolver: SessionUpdatedSubscriptionResolver;
  private readonly steerSessionQueuedMessageMutation: SteerSessionQueuedMessageMutation;
  private readonly unarchiveSessionMutation: UnarchiveSessionMutation;
  private updateSessionTitleMutation: UpdateSessionTitleMutationLike;

  constructor(
    @inject(Config) config: Config,
    @inject(AgentConversationsQueryResolver)
    agentConversationsQueryResolver: AgentConversationsQueryResolver = new AgentConversationsQueryResolver({
      async listConversations() {
        throw new Error("AgentConversations query is not configured.");
      },
      async listMessages() {
        throw new Error("AgentConversationMessages query is not configured.");
      },
      async sendMessage() {
        throw new Error("AgentConversation service is not configured.");
      },
    } as never),
    @inject(AgentConversationMessagesQueryResolver)
    agentConversationMessagesQueryResolver: AgentConversationMessagesQueryResolver =
      new AgentConversationMessagesQueryResolver({
        async listConversations() {
          throw new Error("AgentConversations query is not configured.");
        },
        async listMessages() {
          throw new Error("AgentConversationMessages query is not configured.");
        },
        async sendMessage() {
          throw new Error("AgentConversation service is not configured.");
        },
      } as never),
    @inject(CreateSessionMutation)
    createSessionMutation: CreateSessionMutation = new CreateSessionMutation({
      async createSession() {
        throw new Error("CreateSession mutation is not configured.");
      },
    } as never),
    @inject(ArchiveSessionMutation)
    archiveSessionMutation: ArchiveSessionMutation = new ArchiveSessionMutation({
      async archiveSession() {
        throw new Error("ArchiveSession mutation is not configured.");
      },
    } as never),
    @inject(DeleteAgentConversationMutation)
    deleteAgentConversationMutation: DeleteAgentConversationMutation = new DeleteAgentConversationMutation(),
    @inject(DeleteSessionMutation)
    deleteSessionMutation: DeleteSessionMutation = new DeleteSessionMutation({
      async deleteSession() {
        throw new Error("DeleteSession mutation is not configured.");
      },
    } as never),
    @inject(DeleteSessionQueuedMessageMutation)
    deleteSessionQueuedMessageMutation: DeleteSessionQueuedMessageMutation = new DeleteSessionQueuedMessageMutation(),
    @inject(DismissInboxHumanQuestionMutation)
    dismissInboxHumanQuestionMutation: DismissInboxHumanQuestionMutation = new DismissInboxHumanQuestionMutation({
      async dismissHumanQuestion() {
        throw new Error("DismissInboxHumanQuestion mutation is not configured.");
      },
    } as never),
    @inject(ForkSessionMutation)
    forkSessionMutation: ForkSessionMutation = new ForkSessionMutation({
      async forkSession() {
        throw new Error("ForkSession mutation is not configured.");
      },
    } as never),
    @inject(InboxHumanQuestionsQueryResolver)
    inboxHumanQuestionsQueryResolver: InboxHumanQuestionsQueryResolver = new InboxHumanQuestionsQueryResolver({
      async listOpenHumanQuestions() {
        throw new Error("InboxHumanQuestions query is not configured.");
      },
    } as never),
    @inject(InboxHumanQuestionsUpdatedSubscriptionResolver)
    inboxHumanQuestionsUpdatedSubscriptionResolver: InboxHumanQuestionsUpdatedSubscriptionResolver =
      new InboxHumanQuestionsUpdatedSubscriptionResolver({
        async listOpenHumanQuestions() {
          throw new Error("InboxHumanQuestionsUpdated subscription is not configured.");
        },
      } as never),
    @inject(InterruptSessionMutation)
    interruptSessionMutation: InterruptSessionMutation = new InterruptSessionMutation({
      async interruptSession() {
        throw new Error("InterruptSession mutation is not configured.");
      },
    } as never),
    @inject(MarkSessionReadMutation)
    markSessionReadMutation: MarkSessionReadMutation = {
      async execute() {
        throw new Error("MarkSessionRead mutation is not configured.");
      },
    } as never,
    @inject(PromptSessionMutation)
    promptSessionMutation: PromptSessionMutation = new PromptSessionMutation({
      async prompt() {
        throw new Error("PromptSession mutation is not configured.");
      },
    } as never),
    @inject(ResolveInboxHumanQuestionMutation)
    resolveInboxHumanQuestionMutation: ResolveInboxHumanQuestionMutation = new ResolveInboxHumanQuestionMutation({
      async resolveHumanQuestion() {
        throw new Error("ResolveInboxHumanQuestion mutation is not configured.");
      },
    } as never),
    @inject(SessionMessagesQueryResolver)
    sessionMessagesQueryResolver: SessionMessagesQueryResolver = new SessionMessagesQueryResolver(),
    @inject(SessionInboxHumanQuestionsUpdatedSubscriptionResolver)
    sessionInboxHumanQuestionsUpdatedSubscriptionResolver: SessionInboxHumanQuestionsUpdatedSubscriptionResolver =
      new SessionInboxHumanQuestionsUpdatedSubscriptionResolver({
        async listOpenHumanQuestionsForSession() {
          throw new Error("SessionInboxHumanQuestionsUpdated subscription is not configured.");
        },
      } as never),
    @inject(SessionQueuedMessagesQueryResolver)
    sessionQueuedMessagesQueryResolver: SessionQueuedMessagesQueryResolver = new SessionQueuedMessagesQueryResolver(),
    @inject(SessionMessageUpdatedSubscriptionResolver)
    sessionMessageUpdatedSubscriptionResolver: SessionMessageUpdatedSubscriptionResolver =
      new SessionMessageUpdatedSubscriptionResolver(),
    @inject(SessionQueuedMessagesUpdatedSubscriptionResolver)
    sessionQueuedMessagesUpdatedSubscriptionResolver: SessionQueuedMessagesUpdatedSubscriptionResolver =
      new SessionQueuedMessagesUpdatedSubscriptionResolver(),
    @inject(SessionSecretsQueryResolver)
    sessionSecretsQueryResolver?: SessionSecretsQueryResolver,
    @inject(SessionTranscriptMessagesQueryResolver)
    sessionTranscriptMessagesQueryResolver: SessionTranscriptMessagesQueryResolver =
      new SessionTranscriptMessagesQueryResolver(),
    @inject(SessionsQueryResolver) sessionsQueryResolver: SessionsQueryResolver = new SessionsQueryResolver(),
    @inject(SessionUpdatedSubscriptionResolver)
    sessionUpdatedSubscriptionResolver: SessionUpdatedSubscriptionResolver = new SessionUpdatedSubscriptionResolver(),
    @inject(SteerSessionQueuedMessageMutation)
    steerSessionQueuedMessageMutation: SteerSessionQueuedMessageMutation = new SteerSessionQueuedMessageMutation(),
    @inject(UnarchiveSessionMutation)
    unarchiveSessionMutation: UnarchiveSessionMutation = new UnarchiveSessionMutation({
      async unarchiveSession() {
        throw new Error("UnarchiveSession mutation is not configured.");
      },
    } as never),
    @inject(UpdateSessionTitleMutation)
    updateSessionTitleMutation: UpdateSessionTitleMutation = new UpdateSessionTitleMutation({
      async updateSessionTitle() {
        throw new Error("UpdateSessionTitle mutation is not configured.");
      },
    } as never),
    @inject(AttachSecretToSessionMutation)
    attachSecretToSessionMutation?: AttachSecretToSessionMutation,
    @inject(DetachSecretFromSessionMutation)
    detachSecretFromSessionMutation?: DetachSecretFromSessionMutation,
    @inject(DetachSkillFromSessionMutation)
    detachSkillFromSessionMutation?: DetachSkillFromSessionMutation,
  ) {
    const defaultSecretService = new SecretService(new SecretEncryptionService(config));

    this.agentConversationMessagesQueryResolver = agentConversationMessagesQueryResolver;
    this.agentConversationsQueryResolver = agentConversationsQueryResolver;
    this.archiveSessionMutation = archiveSessionMutation;
    this.attachSecretToSessionMutation = attachSecretToSessionMutation
      ?? new AttachSecretToSessionMutation(defaultSecretService);
    this.createSessionMutation = createSessionMutation;
    this.deleteAgentConversationMutation = deleteAgentConversationMutation;
    this.deleteSessionMutation = deleteSessionMutation;
    this.deleteSessionQueuedMessageMutation = deleteSessionQueuedMessageMutation;
    this.dismissInboxHumanQuestionMutation = dismissInboxHumanQuestionMutation;
    this.detachSecretFromSessionMutation = detachSecretFromSessionMutation
      ?? new DetachSecretFromSessionMutation(defaultSecretService);
    this.detachSkillFromSessionMutation = detachSkillFromSessionMutation
      ?? new DetachSkillFromSessionMutation();
    this.forkSessionMutation = forkSessionMutation;
    this.inboxHumanQuestionsQueryResolver = inboxHumanQuestionsQueryResolver;
    this.inboxHumanQuestionsUpdatedSubscriptionResolver = inboxHumanQuestionsUpdatedSubscriptionResolver;
    this.interruptSessionMutation = interruptSessionMutation;
    this.markSessionReadMutation = markSessionReadMutation;
    this.promptSessionMutation = promptSessionMutation;
    this.resolveInboxHumanQuestionMutation = resolveInboxHumanQuestionMutation;
    this.sessionMessagesQueryResolver = sessionMessagesQueryResolver;
    this.sessionInboxHumanQuestionsUpdatedSubscriptionResolver =
      sessionInboxHumanQuestionsUpdatedSubscriptionResolver;
    this.sessionQueuedMessagesQueryResolver = sessionQueuedMessagesQueryResolver;
    this.sessionMessageUpdatedSubscriptionResolver = sessionMessageUpdatedSubscriptionResolver;
    this.sessionQueuedMessagesUpdatedSubscriptionResolver = sessionQueuedMessagesUpdatedSubscriptionResolver;
    this.sessionSecretsQueryResolver = sessionSecretsQueryResolver
      ?? new SessionSecretsQueryResolver(defaultSecretService);
    this.sessionTranscriptMessagesQueryResolver = sessionTranscriptMessagesQueryResolver;
    this.sessionsQueryResolver = sessionsQueryResolver;
    this.sessionUpdatedSubscriptionResolver = sessionUpdatedSubscriptionResolver;
    this.steerSessionQueuedMessageMutation = steerSessionQueuedMessageMutation;
    this.unarchiveSessionMutation = unarchiveSessionMutation;
    this.updateSessionTitleMutation = updateSessionTitleMutation;
  }

  createResolvers(): GraphqlResolverFragment {
    return {
      Mutation: {
        ArchiveSession: this.archiveSessionMutation.execute,
        AttachSecretToSession: this.attachSecretToSessionMutation.execute,
        CreateSession: this.createSessionMutation.execute,
        DeleteAgentConversation: this.deleteAgentConversationMutation.execute,
        DeleteSession: this.deleteSessionMutation.execute,
        DeleteSessionQueuedMessage: this.deleteSessionQueuedMessageMutation.execute,
        DismissInboxHumanQuestion: this.dismissInboxHumanQuestionMutation.execute,
        DetachSecretFromSession: this.detachSecretFromSessionMutation.execute,
        DetachSkillFromSession: this.detachSkillFromSessionMutation.execute,
        ForkSession: this.forkSessionMutation.execute,
        InterruptSession: this.interruptSessionMutation.execute,
        MarkSessionRead: this.markSessionReadMutation.execute,
        PromptSession: this.promptSessionMutation.execute,
        ResolveInboxHumanQuestion: this.resolveInboxHumanQuestionMutation.execute,
        SteerSessionQueuedMessage: this.steerSessionQueuedMessageMutation.execute,
        UnarchiveSession: this.unarchiveSessionMutation.execute,
        UpdateSessionTitle: this.updateSessionTitleMutation.execute,
      },
      Query: {
        AgentConversationMessages: this.agentConversationMessagesQueryResolver.execute,
        AgentConversations: this.agentConversationsQueryResolver.execute,
        InboxHumanQuestions: this.inboxHumanQuestionsQueryResolver.execute,
        SessionMessages: this.sessionMessagesQueryResolver.execute,
        SessionQueuedMessages: this.sessionQueuedMessagesQueryResolver.execute,
        SessionSecrets: this.sessionSecretsQueryResolver.execute,
        SessionTranscriptMessages: this.sessionTranscriptMessagesQueryResolver.execute,
        Sessions: this.sessionsQueryResolver.execute,
      },
      Subscription: {
        InboxHumanQuestionsUpdated: {
          subscribe: this.inboxHumanQuestionsUpdatedSubscriptionResolver.subscribe,
          resolve: this.inboxHumanQuestionsUpdatedSubscriptionResolver.resolve,
        },
        SessionInboxHumanQuestionsUpdated: {
          subscribe: this.sessionInboxHumanQuestionsUpdatedSubscriptionResolver.subscribe,
          resolve: this.sessionInboxHumanQuestionsUpdatedSubscriptionResolver.resolve,
        },
        SessionMessageUpdated: {
          subscribe: this.sessionMessageUpdatedSubscriptionResolver.subscribe,
          resolve: this.sessionMessageUpdatedSubscriptionResolver.resolve,
        },
        SessionQueuedMessagesUpdated: {
          subscribe: this.sessionQueuedMessagesUpdatedSubscriptionResolver.subscribe,
          resolve: this.sessionQueuedMessagesUpdatedSubscriptionResolver.resolve,
        },
        SessionUpdated: {
          subscribe: this.sessionUpdatedSubscriptionResolver.subscribe,
          resolve: this.sessionUpdatedSubscriptionResolver.resolve,
        },
      },
    };
  }

  getArchiveSessionMutation(): ArchiveSessionMutationLike {
    return this.archiveSessionMutation;
  }

  setArchiveSessionMutation(archiveSessionMutation: ArchiveSessionMutationLike): void {
    this.archiveSessionMutation = archiveSessionMutation;
  }

  getUpdateSessionTitleMutation(): UpdateSessionTitleMutationLike {
    return this.updateSessionTitleMutation;
  }

  setUpdateSessionTitleMutation(updateSessionTitleMutation: UpdateSessionTitleMutationLike): void {
    this.updateSessionTitleMutation = updateSessionTitleMutation;
  }
}
