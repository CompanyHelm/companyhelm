import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquareReplyIcon, StarIcon } from "lucide-react";
import { MarkdownContent } from "@/components/markdown_content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";

export type InboxQuestionCardRecord = {
  agentId: string;
  agentName: string;
  allowCustomAnswer: boolean;
  createdAt: string;
  id: string;
  proposals: Array<{
    answerText: string;
    cons: string[];
    id: string;
    pros: string[];
    rating: number;
  }>;
  questionText: string;
  sessionId: string;
  sessionTitle: string;
  summary: string;
  title: string;
};

interface InboxQuestionCardProps {
  isDismissing: boolean;
  isResolving: boolean;
  onDismiss(input: {
    inboxItemId: string;
  }): Promise<void>;
  onResolve(input: {
    customAnswerText?: string;
    inboxItemId: string;
    proposalId?: string;
  }): Promise<void>;
  question: InboxQuestionCardRecord;
}

function renderRating(rating: number) {
  return (
    <div className="flex items-center gap-1 text-amber-400">
      {Array.from({ length: 5 }, (_value, index) => (
        <StarIcon
          key={index}
          className={`size-3.5 ${index < rating ? "fill-current" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

/**
 * Renders one pending human inbox question with ranked proposals and an optional custom-answer
 * entry so the operator can respond without leaving the inbox page.
 */
export function InboxQuestionCard(props: InboxQuestionCardProps) {
  const [customAnswerText, setCustomAnswerText] = useState("");
  const organizationSlug = useCurrentOrganizationSlug();
  const hasCustomAnswer = customAnswerText.trim().length > 0;
  const isBusy = props.isResolving || props.isDismissing;

  return (
    <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base">{props.question.title}</CardTitle>
            <CardDescription>{props.question.summary}</CardDescription>
          </div>
          <Link
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            search={{
              agentId: props.question.agentId,
              sessionId: props.question.sessionId,
            }}
            params={{ organizationSlug }}
            to={OrganizationPath.route("/chats")}
          >
            <MessageSquareReplyIcon className="size-3.5" />
            Open chat
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{props.question.agentName}</span>
          <span>{props.question.sessionTitle}</span>
          <span>{new Date(props.question.createdAt).toLocaleString()}</span>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
          <MarkdownContent content={props.question.questionText} />
        </div>

        {props.question.proposals.length > 0 ? (
          <div className="grid gap-3">
            {props.question.proposals.map((proposal) => {
              return (
                <button
                  disabled={isBusy}
                  key={proposal.id}
                  className={`grid gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    isBusy
                      ? "border-border/60 bg-background opacity-70"
                      : "border-border/60 bg-background hover:border-border hover:bg-muted/20"
                  }`}
                  onClick={async () => {
                    setCustomAnswerText("");
                    await props.onResolve({
                      inboxItemId: props.question.id,
                      proposalId: proposal.id,
                    });
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 font-medium">
                      <MarkdownContent content={proposal.answerText} />
                    </div>
                    {renderRating(proposal.rating)}
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="font-medium uppercase tracking-[0.18em] text-[0.65rem] text-foreground/70">
                        Pros
                      </div>
                      <ul className="ml-4 grid list-disc gap-1">
                        {proposal.pros.length > 0
                          ? proposal.pros.map((pro) => (
                            <li key={pro}>
                              <MarkdownContent content={pro} tone="muted" variant="compact" />
                            </li>
                          ))
                          : <li>No explicit pros provided.</li>}
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium uppercase tracking-[0.18em] text-[0.65rem] text-foreground/70">
                        Cons
                      </div>
                      <ul className="ml-4 grid list-disc gap-1">
                        {proposal.cons.length > 0
                          ? proposal.cons.map((con) => (
                            <li key={con}>
                              <MarkdownContent content={con} tone="muted" variant="compact" />
                            </li>
                          ))
                          : <li>No explicit cons provided.</li>}
                      </ul>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {props.question.allowCustomAnswer ? (
          <div className="grid gap-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Custom answer
            </label>
            <textarea
              className="min-h-24 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              disabled={isBusy}
              onChange={(event) => {
                setCustomAnswerText(event.target.value);
              }}
              placeholder="Type your own answer instead of selecting one of the proposals."
              value={customAnswerText}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Button
            disabled={isBusy}
            onClick={async () => {
              await props.onDismiss({
                inboxItemId: props.question.id,
              });
            }}
            type="button"
            variant="ghost"
          >
            {props.isDismissing ? "Dismissing..." : "Dismiss"}
          </Button>
          {props.question.allowCustomAnswer ? (
            <Button
              disabled={!hasCustomAnswer || isBusy}
              onClick={async () => {
                await props.onResolve({
                  customAnswerText: hasCustomAnswer ? customAnswerText.trim() : undefined,
                  inboxItemId: props.question.id,
                });
              }}
              type="button"
            >
              {props.isResolving ? "Sending..." : "Send answer"}
            </Button>
          ) : <div />}
        </div>
      </CardContent>
    </Card>
  );
}
