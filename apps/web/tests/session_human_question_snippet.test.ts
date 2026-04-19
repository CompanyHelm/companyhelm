import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionHumanQuestionSnippet } from "../src/pages/chats/session_human_question_snippet";

test("renders pending chat human questions and proposals as markdown", () => {
  const html = renderToStaticMarkup(createElement(SessionHumanQuestionSnippet, {
    isDismissing: false,
    isResolving: false,
    onDismiss: () => {},
    onSelectProposal: () => {},
    question: {
      allowCustomAnswer: true,
      id: "question_1",
      proposals: [{
        answerText: "Use `start_workflow` with **idempotency**.",
        id: "proposal_1",
        rating: 5,
      }],
      questionText: "Choose whether to add `idempotencyKey`.\n\n- Persist on `workflow_runs`",
      title: "Choose idempotency design",
    },
  }));

  assert.match(html, /<code[^>]*>idempotencyKey<\/code>/);
  assert.match(html, /<li[^>]*>.*Persist on <code[^>]*>workflow_runs<\/code>.*<\/li>/);
  assert.match(html, /<code[^>]*>start_workflow<\/code>/);
  assert.match(html, /<strong>idempotency<\/strong>/);
});
