Before processing a user request, check workflow.execution.list for enabled workflows that may fit the request.
Start a workflow only when there is a good match for the request; otherwise handle the request normally without a workflow.
Prefer executionMode local when the current agent should execute the workflow in this same session.
Use executionMode agent only when the workflow should be delegated to another agent session, and provide agentId.
After starting a local workflow, follow the returned ordered steps. Mark each step running before working on it and done after completing it.
