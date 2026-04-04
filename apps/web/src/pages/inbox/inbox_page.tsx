import { Suspense, useState } from "react";
import { InboxIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { useToast } from "@/components/toast_provider";
import { InboxQuestionCard, type InboxQuestionCardRecord } from "./inbox_question_card";
import type { inboxPageDismissInboxHumanQuestionMutation } from "./__generated__/inboxPageDismissInboxHumanQuestionMutation.graphql";
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

const inboxPageDismissInboxHumanQuestionMutationNode = graphql`
  mutation inboxPageDismissInboxHumanQuestionMutation($input: DismissInboxHumanQuestionInput!) {
    DismissInboxHumanQuestion(input: $input) {
      id
      status
    }
  }
`;

function InboxPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-4">
      <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
        Loading inbox items...
      </div>
    </main>
  );
}

function InboxPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    inboxItemId: string;
    type: "dismiss" | "resolve";
  } | null>(null);
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
  const [commitDismissInboxHumanQuestion] = useMutation<inboxPageDismissInboxHumanQuestionMutation>(
    inboxPageDismissInboxHumanQuestionMutationNode,
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

  const removeQuestionFromStore = (store: {
    getRoot(): {
      getLinkedRecords(name: string): Array<{ getDataID(): string } | null> | null;
      setLinkedRecords(records: Array<{ getDataID(): string }>, name: string): void;
    };
    getRootField(name: string): { getDataID(): string } | null;
  }, rootFieldName: string) => {
    const resolvedQuestion = store.getRootField(rootFieldName);
    const resolvedId = resolvedQuestion?.getDataID();
    if (!resolvedId) {
      return;
    }

    const rootRecord = store.getRoot();
    const currentQuestions = rootRecord.getLinkedRecords("InboxHumanQuestions") || [];
    rootRecord.setLinkedRecords(
      currentQuestions.filter((record): record is { getDataID(): string } => {
        return Boolean(record) && record.getDataID() !== resolvedId;
      }),
      "InboxHumanQuestions",
    );
  };

  return (
    <main className="flex flex-1 flex-col gap-4">
      {errorMessage ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {questions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-12 text-center">
          <InboxIcon className="size-8 text-muted-foreground/70" />
          <div className="text-sm font-medium text-foreground">Inbox is clear</div>
          <div className="max-w-xl text-xs text-muted-foreground">
            New human questions from agents will appear here when they need a decision, preference, or approval.
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {questions.map((question) => (
            <InboxQuestionCard
              key={question.id}
              isDismissing={pendingAction?.inboxItemId === question.id && pendingAction.type === "dismiss"}
              isResolving={pendingAction?.inboxItemId === question.id && pendingAction.type === "resolve"}
              onDismiss={async (input) => {
                setErrorMessage(null);
                setPendingAction({
                  inboxItemId: question.id,
                  type: "dismiss",
                });

                try {
                  await new Promise<void>((resolve, reject) => {
                    commitDismissInboxHumanQuestion({
                      variables: {
                        input,
                      },
                      updater: (store) => {
                        removeQuestionFromStore(store, "DismissInboxHumanQuestion");
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

                  showSavedToast("Question dismissed");
                } catch (error: unknown) {
                  setErrorMessage(error instanceof Error ? error.message : "Failed to dismiss question.");
                } finally {
                  setPendingAction((currentValue) => currentValue?.inboxItemId === question.id ? null : currentValue);
                }
              }}
              onResolve={async (input) => {
                setErrorMessage(null);
                setPendingAction({
                  inboxItemId: question.id,
                  type: "resolve",
                });

                try {
                  await new Promise<void>((resolve, reject) => {
                    commitResolveInboxHumanQuestion({
                      variables: {
                        input,
                      },
                      updater: (store) => {
                        removeQuestionFromStore(store, "ResolveInboxHumanQuestion");
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
                  setPendingAction((currentValue) => currentValue?.inboxItemId === question.id ? null : currentValue);
                }
              }}
              question={question}
            />
          ))}
        </div>
      )}
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
