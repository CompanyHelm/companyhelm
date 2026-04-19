import { Loader2Icon, StarIcon, XIcon } from "lucide-react";
import { MarkdownContent } from "@/components/markdown_content";

export type SessionHumanQuestionSnippetRecord = {
  allowCustomAnswer: boolean;
  id: string;
  proposals: Array<{
    answerText: string;
    id: string;
    rating: number;
  }>;
  questionText: string;
  title: string;
};

interface SessionHumanQuestionSnippetProps {
  isDismissing: boolean;
  isResolving: boolean;
  onDismiss: () => void;
  onSelectProposal: (proposalId: string) => void;
  question: SessionHumanQuestionSnippetRecord;
}

function renderRating(rating: number) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }, (_value, index) => (
        <StarIcon
          key={index}
          className={`size-3 ${index < rating ? "fill-current" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

/**
 * Shows the latest pending human question inline inside the chat composer so the operator can pick
 * one of the proposed answers without leaving the active session.
 */
export function SessionHumanQuestionSnippet(props: SessionHumanQuestionSnippetProps) {
  const isBusy = props.isResolving || props.isDismissing;

  return (
    <div className="border-b border-border/60 px-2.5 pt-2.5 pb-2">
      <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Question for human
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{props.question.title}</p>
            <MarkdownContent
              className="mt-2"
              content={props.question.questionText}
              tone="muted"
            />
          </div>
          <button
            aria-label="Dismiss question"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={props.onDismiss}
            title={props.isDismissing ? "Dismissing question..." : "Dismiss question"}
            type="button"
          >
            {props.isDismissing ? <Loader2Icon className="size-3.5 animate-spin" /> : <XIcon className="size-3.5" />}
          </button>
        </div>

        {props.question.proposals.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {props.question.proposals.map((proposal) => (
              <button
                key={proposal.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/15 px-3 py-2 text-left transition hover:border-border hover:bg-muted/25 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
                onClick={() => props.onSelectProposal(proposal.id)}
                type="button"
              >
                <div className="min-w-0 flex-1 font-medium" title={proposal.answerText}>
                  <MarkdownContent content={proposal.answerText} />
                </div>
                {renderRating(proposal.rating)}
              </button>
            ))}
          </div>
        ) : null}

        {props.question.allowCustomAnswer ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Or type your own answer below and press send.
          </p>
        ) : null}
      </div>
    </div>
  );
}
