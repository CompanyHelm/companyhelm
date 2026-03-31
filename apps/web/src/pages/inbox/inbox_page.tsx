import { Suspense, useState } from "react";
import { InboxIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/toast_provider";
import { InboxQuestionCard, type InboxQuestionCardRecord } from "./inbox_question_card";
import type { inboxPageQuery } from "./__generated__/inboxPageQuery.graphql";
import type { inboxPageResolveInboxHumanQuestionMutation } from "./__generated__/inboxPageResolveInboxHumanQuestionMutation.graphql";

const inboxPageQueryNode = graphql`
  query inboxPageQuery {
    InboxHumanQuestions {
      id
      sessionId
      sessionTitle
      agentId
      agentName
      title
      summary
      questionText
      allowCustomAnswer
      status
      createdAt
      proposals {
        id
        answerText
        rating
        pros
        cons
      }
    }
  }
`;

const inboxPageResolveInboxHumanQuestionMutationNode = graphql`
  mutation inboxPageResolveInboxHumanQuestionMutation($input: ResolveInboxHumanQuestionInput!) {
    ResolveInboxHumanQuestion(input: $input) {
      id
      status
      answer {
        id
      }
    }
  }
`;

function InboxPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Loading pending human questions from agents.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            Loading inbox items...
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function InboxPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvingInboxItemId, setResolvingInboxItemId] = useState<string | null>(null);
  const { showSavedToast } = useToast();
  const data = useLazyLoadQuery<inboxPageQuery>(
    inboxPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitResolveInboxHumanQuestion] = useMutation<inboxPageResolveInboxHumanQuestionMutation>(
    inboxPageResolveInboxHumanQuestionMutationNode,
  );
  const questions: InboxQuestionCardRecord[] = data.InboxHumanQuestions.map((question) => ({
    agentId: question.agentId,
    agentName: question.agentName,
    allowCustomAnswer: question.allowCustomAnswer,
    createdAt: question.createdAt,
    id: question.id,
    proposals: question.proposals.map((proposal) => ({
      answerText: proposal.answerText,
      cons: proposal.cons,
      id: proposal.id,
      pros: proposal.pros,
      rating: proposal.rating,
    })),
    questionText: question.questionText,
    sessionId: question.sessionId,
    sessionTitle: question.sessionTitle,
    summary: question.summary,
    title: question.title,
  }));

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>
            Resolve agent questions here. Every answer is steered back into the originating chat automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
              <InboxIcon className="size-8 text-muted-foreground/70" />
              <div className="text-sm font-medium text-foreground">Inbox is clear</div>
              <div className="max-w-xl text-xs text-muted-foreground">
                New human questions from agents will appear here when they need a decision, preference, or approval.
              </div>
            </div>
          ) : (
            questions.map((question) => (
              <InboxQuestionCard
                key={question.id}
                isResolving={resolvingInboxItemId === question.id}
                onResolve={async (input) => {
                  setErrorMessage(null);
                  setResolvingInboxItemId(question.id);

                  try {
                    await new Promise<void>((resolve, reject) => {
                      commitResolveInboxHumanQuestion({
                        variables: {
                          input,
                        },
                        updater: (store) => {
                          const resolvedQuestion = store.getRootField("ResolveInboxHumanQuestion");
                          const resolvedId = resolvedQuestion?.getDataID();
                          if (!resolvedId) {
                            return;
                          }

                          const rootRecord = store.getRoot();
                          const currentQuestions = rootRecord.getLinkedRecords("InboxHumanQuestions") || [];
                          rootRecord.setLinkedRecords(
                            currentQuestions.filter((record) => record && record.getDataID() !== resolvedId),
                            "InboxHumanQuestions",
                          );
                        },
                        onCompleted: (_response, errors) => {
                          const nextErrorMessage = errors?.[0]?.message;
                          if (nextErrorMessage) {
                            reject(new Error(nextErrorMessage));
                            return;
                          }

                          resolve();
                        },
                        onError: reject,
                      });
                    });

                    showSavedToast("Answer sent");
                  } catch (error: unknown) {
                    setErrorMessage(error instanceof Error ? error.message : "Failed to send answer.");
                  } finally {
                    setResolvingInboxItemId((currentValue) => currentValue === question.id ? null : currentValue);
                  }
                }}
                question={question}
              />
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export function InboxPage() {
  return (
    <Suspense fallback={<InboxPageFallback />}>
      <InboxPageContent />
    </Suspense>
  );
}
