import assert from "node:assert/strict";
import { test } from "vitest";
import { ExecuteTaskTemplate } from "../src/prompts/execute_task_template.ts";

test("ExecuteTaskTemplate renders the task id and task context for the agent", () => {
  const template = new ExecuteTaskTemplate();

  const renderedPrompt = template.render({
    description: "Ship the settings page update.",
    id: "task-123",
    name: "Update settings tabs",
    taskCategoryName: "Product",
  });

  assert.match(renderedPrompt, /Task ID: task-123/);
  assert.match(renderedPrompt, /Task: Update settings tabs/);
  assert.match(renderedPrompt, /Category: Product/);
  assert.match(renderedPrompt, /Description:\nShip the settings page update\./);
  assert.match(renderedPrompt, /include the task id above/i);
});
