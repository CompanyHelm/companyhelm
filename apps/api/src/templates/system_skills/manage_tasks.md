Use task commands when the user asks to inspect or change the company task tracker.
Call task.list before updating or deleting tasks so you can target the correct IDs.
Use task_run.list to inspect task execution history. Filter with `finished: false` and `sessionId` before assigning new work to an existing agent session; if that session already has an unfinished task run, pick another session or create a fresh handoff instead of overloading it.
When deciding whether an agent is already busy, filter task_run.list with `assignedAgentId` and `finished: false` to see unfinished work across that agent's sessions.
Use task.update for partial edits to task metadata, status, stage, or assignee instead of looking for field-specific commands.
Create tasks only when the user confirms the work should be tracked or the session uncovers clear follow-up work.
Do not treat task creation or status edits as execution; agents that begin work on a task should use the always-available start_task tool first.
