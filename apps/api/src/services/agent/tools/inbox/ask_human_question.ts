import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentInboxResultFormatter } from "./result_formatter.ts";
import { AgentInboxToolService } from "./service.ts";

/**
 * Lets the agent escalate a decision to the human inbox with ranked answer proposals. The tool
 * returns immediately after persisting the inbox item so the agent can decide whether to continue
 * working or wait for the eventual steer reply from the human.
 */
export class AgentAskHumanQuestionTool {
  private static readonly parameters = Type.Object({
    allowCustomAnswer: Type.Optional(Type.Boolean({
      description: "Whether the human should be allowed to type an answer instead of choosing one of the proposals.",
    })),
    proposals: Type.Array(Type.Object({
      answerText: Type.String({
        description: "One proposed answer the human can choose.",
      }),
      cons: Type.Optional(Type.Array(Type.String(), {
        description: "Trade-offs or risks for this proposal.",
      })),
      pros: Type.Optional(Type.Array(Type.String(), {
        description: "Benefits for this proposal.",
      })),
      rating: Type.Integer({
        description: "A 1 to 5 rating where 5 means the agent strongly recommends this option.",
      }),
    }), {
      description: "Up to 4 proposed answers shown to the human in rating order.",
      maxItems: 4,
    }),
    questionText: Type.String({
      description: "The question the agent wants the human to answer.",
    }),
    title: Type.Optional(Type.String({
      description: "Optional short title for the inbox item. Defaults from the question text when omitted.",
    })),
  });

  private readonly inboxToolService: AgentInboxToolService;

  constructor(inboxToolService: AgentInboxToolService) {
    this.inboxToolService = inboxToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentAskHumanQuestionTool.parameters> {
    return {
      description: "Ask the human a question in the inbox with ranked answer proposals. When the human answers, the result is sent back into the current session as a steer message.",
      execute: async (toolCallId, params) => {
        const question = await this.inboxToolService.createHumanQuestion({
          allowCustomAnswer: params.allowCustomAnswer,
          proposals: params.proposals.map((proposal) => ({
            answerText: proposal.answerText,
            cons: proposal.cons,
            pros: proposal.pros,
            rating: proposal.rating,
          })),
          questionText: params.questionText,
          title: params.title,
          toolCallId,
        });

        return {
          content: [{
            text: AgentInboxResultFormatter.formatCreateHumanQuestionResult(question),
            type: "text",
          }],
          details: {
            inboxItemId: question.id,
            status: "open",
            type: "inbox",
          },
        };
      },
      label: "ask_human_question",
      name: "ask_human_question",
      parameters: AgentAskHumanQuestionTool.parameters,
      promptGuidelines: [
        "Use ask_human_question when the next step depends on a human preference, approval, or choice.",
        "Provide at most 4 proposals, each with a 1 to 5 rating and concise pros and cons.",
        "The tool returns immediately; if you are blocked, explain that you are waiting for the human response.",
      ],
      promptSnippet: "Ask the human a ranked multiple-choice question",
    };
  }
}
