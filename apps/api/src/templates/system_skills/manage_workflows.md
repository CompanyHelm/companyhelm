Use workflow management commands only when the user asks to inspect or change durable workflow definitions.
Call workflow.list before updating workflows, inputs, or steps so you can target the correct IDs, including disabled workflows.
Prefer small edits that preserve existing inputs and steps unless the user asks for a broader rewrite.
Keep workflow step instructions concrete enough for a later agent session to execute without extra context.
Do not start workflow runs with this skill; use the Execute workflows system skill for workflow execution.
