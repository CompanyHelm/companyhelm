import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import {
  AgentInboxService,
  type AgentInboxHumanQuestionRecord,
} from "../../../../../inbox/service.ts";

/**
 * Binds the generic inbox service to the current PI Mono prompt context so tools can create inbox
 * items without manually threading company, session, and agent identifiers through every call.
 */
export class AgentInboxToolService {
  private readonly agentId: string;
  private readonly companyId: string;
  private readonly inboxService: AgentInboxService;
  private readonly sessionId: string;
  private readonly transactionProvider: TransactionProviderInterface;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    sessionId: string,
    inboxService: AgentInboxService,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.agentId = agentId;
    this.sessionId = sessionId;
    this.inboxService = inboxService;
  }

  async createHumanQuestion(input: {
    allowCustomAnswer?: boolean;
    proposals: Array<{
      answerText: string;
      cons?: string[];
      pros?: string[];
      rating: number;
    }>;
    questionText: string;
    title?: string | null;
    toolCallId?: string | null;
  }): Promise<AgentInboxHumanQuestionRecord> {
    return this.inboxService.createHumanQuestion(this.transactionProvider, {
      agentId: this.agentId,
      allowCustomAnswer: input.allowCustomAnswer,
      companyId: this.companyId,
      proposals: input.proposals,
      questionText: input.questionText,
      sessionId: this.sessionId,
      title: input.title,
      toolCallId: input.toolCallId,
    });
  }
}
