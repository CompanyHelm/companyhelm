# Codex-Inspired Agent Prompt and Tooling Proposal for companyhelm-ng

**Goal:** Compare the current `companyhelm-ng` PI Mono agent stack with the Codex agent stack in the sibling `codex` repo and propose a better prompt and tool surface for `companyhelm-ng`.

**Scope:** Proposal only. This document does not implement the changes; it defines the recommended prompt architecture, tool roadmap, and rollout order.

**Observed source files:**
- `companyhelm-ng/apps/api/src/templates/system_prompt.njk`
- `companyhelm-ng/apps/api/src/services/agent/session/pi-mono/companyhelm_resource_loader.ts`
- `companyhelm-ng/apps/api/src/services/agent/session/pi-mono/session_manager_service.ts`
- `companyhelm-ng/apps/api/src/services/agent/tools/**/*`
- `companyhelm-ng/apps/api/tests/pi_mono_tools_service.test.ts`
- `codex/codex-rs/core/gpt_5_codex_prompt.md`
- `codex/codex-rs/core/prompt_with_apply_patch_instructions.md`
- `codex/codex-rs/core/review_prompt.md`
- `codex/codex-rs/tools/src/lib.rs`
- `codex/codex-rs/tools/src/agent_tool.rs`
- `codex/codex-rs/tools/src/request_user_input_tool.rs`
- `codex/codex-rs/tools/src/tool_discovery.rs`

---

## Current Comparison

### What companyhelm-ng does today

The current `companyhelm-ng` system prompt is intentionally minimal. It establishes identity metadata, warns the agent not to claim filesystem or shell access unless a tool result proves it, and says to rely only on conversation state plus CompanyHelm tools. That is a good truthfulness baseline, but it is not a complete operating contract.

The current PI Mono tool surface is also real but narrow. Based on `apps/api/tests/pi_mono_tools_service.test.ts`, the runtime currently exposes:
- terminal tools: `list_pty_sessions`, `execute_command`, `apply_patch`, `send_pty_input`, `read_pty_output`, `resize_pty`, `kill_session`, `close_session`
- context tools: secrets, company directory, artifacts, tasks
- collaboration tools: `ask_human_question`, `send_agent_message`
- web tools: `web_search`, `web_fetch`
- GitHub tools: `list_github_installations`, `gh_exec`
- durable agent admin tools: `list_agents`, `create_agent`, `update_agent`

This means the agent can act, but it has to infer too much on its own:
- when to plan versus when to execute
- how to ask for clarification in-session versus opening a durable inbox item
- how to delegate work safely
- how to choose between raw shell, raw `gh`, and structured tools
- how to validate work before declaring success
- how to format progress updates and final answers consistently

### What Codex does better

Codex is stronger in two places at once:
- the prompt is much more explicit about the execution loop, collaboration style, validation, tool-selection heuristics, review behavior, and final-answer formatting
- the tool surface is broader and more opinionated, so the model has safer primitives than "just use the shell"

Important Codex prompt traits worth borrowing:
- explicit work loop: inspect, plan when needed, execute, validate, report
- explicit truthfulness boundaries: do not claim actions that tool results do not prove
- explicit progress-update behavior during long tasks
- explicit review mode that prioritizes findings over summary
- explicit final-answer structure so outputs stay concise and useful
- explicit handling for AGENTS-style repo instructions and mode-specific behavior

Important Codex tool traits worth borrowing:
- structured planning via `update_plan`
- structured clarifications via `request_user_input`
- ephemeral multi-agent delegation via `spawn_agent`, `send_input`, `wait_agent`, `close_agent`
- tool discovery instead of forcing the model to remember every tool upfront
- richer specialized tools so raw shell and raw `gh` become fallback paths, not the default

---

## Main Gaps in companyhelm-ng

### Prompt gaps

The current `system_prompt.njk` is too small to shape behavior. It tells the model what not to hallucinate, but it does not tell it how to work well. The missing pieces are:
- no execution policy for multi-step work
- no planning policy
- no clarification policy
- no validation policy
- no review policy
- no response-format policy
- no guidance for choosing the safest or highest-signal tool
- no distinction between synchronous clarification and asynchronous human escalation
- no distinction between ephemeral delegation and durable company-agent administration

### Tool gaps

The current toolset over-indexes on durable admin and generic execution:
- `create_agent` / `update_agent` are persistent configuration tools, but there is no Codex-style ephemeral task worker
- `gh_exec` is flexible, but it forces the model to remember GitHub CLI syntax and encourages raw shell-like behavior
- `ask_human_question` is useful for durable inbox workflows, but it is too heavy for quick in-session clarification
- `execute_command` is powerful, but there are no cheap structured read helpers like file search, file read, or directory listing
- there is no first-class planning tool
- there is no tool discovery or lazy-loading mechanism

The result is a runtime that is technically capable but cognitively expensive for the model.

---

## Prompt Proposal

### Recommended prompt architecture

`companyhelm-ng` should move from one short static prompt to a layered prompt stack:

1. **Runtime facts layer**
   Include identity, company, session, current date, timezone, available capabilities, and any environment access guarantees.

2. **Operating contract layer**
   Define how the agent should inspect, plan, execute, validate, escalate, and report.

3. **Mode layer**
   Add small overlays for modes like default execution, review, planning-only, or admin workflows.

4. **Company base prompt layer**
   Keep company-wide policies here, separate from the product-owned base operating contract.

5. **Per-agent override layer**
   Keep role-specific behavior here, but avoid re-stating the entire product contract inside every agent record.

This matches what Codex does well: stable product-level behavior in the base prompt, context-specific instructions in higher-precedence overlays.

### Recommended base system prompt shape

The replacement base prompt should be closer to this structure:

```md
You are CompanyHelm's embedded execution agent.

## Identity
- Company name: {{ companyName }}
- Agent name: {{ agentName }}
- Agent id: {{ agentId }}
- Session id: {{ sessionId }}
- Current date: {{ currentDate }}
- Timezone: {{ timeZone }}

Treat these values as authoritative runtime facts.

## Truthfulness
- Only claim actions that are supported by tool results from this session.
- Do not claim repo access, shell access, file reads, test results, or external facts unless a tool result explicitly proves them.
- If information may be stale or time-sensitive, use the available web or product tools instead of relying on memory.

## Working style
- For non-trivial work, inspect context first and maintain a short plan.
- Prefer structured tools over raw command execution when both can solve the task.
- Ask for clarification only when the next step is blocked and no reasonable assumption is safe.
- If a reasonable default exists, state it briefly and proceed.
- During long tasks, send short progress updates so the human can follow what is happening.

## Execution loop
- Inspect the relevant context.
- Plan if the task has multiple dependent steps.
- Execute the smallest high-signal next action.
- Validate the result before claiming completion.
- Report the outcome, validation, and any remaining risk.

## Clarifications and escalation
- Use a lightweight question tool for short in-session decisions.
- Use the inbox/escalation tool only when the question should persist outside the current turn or requires durable human follow-up.

## Delegation
- Use ephemeral task agents for bounded side work that can run in parallel.
- Do not create or modify durable company agents unless the task is explicitly about agent administration.

## Review mode
- If the user asks for a review, prioritize concrete findings, risks, and regressions over summary.

## Final responses
- Keep the final response concise.
- Lead with the outcome.
- Mention validation performed and any remaining limitation.
```

### Why this is better

This keeps the good part of the current prompt, which is truthfulness, and adds the missing operational behavior. It also separates stable product behavior from company- and agent-specific policy so `companyhelm-ng` stops depending on every agent record to restate basic working norms.

### Specific changes to make

**Files:**
- modify `apps/api/src/templates/system_prompt.njk`
- extend `apps/api/src/prompts/system_prompt_template_context.ts`
- update `apps/api/src/services/agent/session/pi-mono/companyhelm_resource_loader.ts`

**Recommended additions to prompt context:**
- current date
- timezone
- collaboration mode
- available tool namespaces or capability summary
- whether synchronous user-input requests are supported
- whether ephemeral task-agent delegation is supported

---

## Tool Proposal

### Priority 0: Add the missing execution primitives

These are the highest-value Codex ideas to port first.

#### 1. Add `update_plan`

Codex is substantially better because it gives the model a structured place to track multi-step work. `companyhelm-ng` currently has no equivalent, so the model either keeps plans implicit or repeats them in chat.

**Why add it:**
- better long-running task coordination
- better user visibility
- simpler reasoning for the agent
- lower prompt burden because the prompt can say "use the plan tool" instead of teaching the model how to narrate plans manually

#### 2. Add `request_user_input`

`ask_human_question` is not a substitute. It creates a durable inbox item and is right for asynchronous approvals or persistent decisions. It is too heavy for "pick option A or B so I can continue this turn."

**Why add it:**
- fast in-session clarification
- structured choices with ranked recommendations
- lower friction than opening inbox items
- cleaner control flow for the model

**Keep both tools:**
- `request_user_input` for synchronous turn-time clarification
- `ask_human_question` for durable, asynchronous escalation

#### 3. Add ephemeral delegation tools

Codex has transient worker semantics. `companyhelm-ng` currently only has durable company-agent administration plus `send_agent_message`. Those are not the same thing.

**Add tools like:**
- `spawn_task_agent`
- `send_task_agent_message`
- `wait_task_agent`
- `close_task_agent`

**Why this matters:**
- the model can parallelize bounded work without mutating company configuration
- durable `create_agent` becomes an explicit admin path, not the default delegation mechanism
- the prompt can safely recommend delegation without creating persistent product objects

#### 4. Add structured repo-reading tools

The runtime already has `execute_command`, but the Codex lesson is that read-heavy work should not require raw shell every time.

**Add tools like:**
- `list_directory`
- `read_file`
- `search_text`
- `search_files`

**Why this matters:**
- faster, cheaper repo inspection
- less command-string synthesis
- less noisy terminal output in transcript history
- simpler reasoning for models that are strong at tool selection but weaker at shell ergonomics

### Priority 1: Replace generic tools with more structured domain tools

#### 5. Expand GitHub tools and demote `gh_exec`

Codex works well because connector-backed tools expose intent directly. `companyhelm-ng` should do the same for GitHub. `gh_exec` should remain a fallback, not the primary GitHub interface.

**Add tools like:**
- `github_get_pull_request`
- `github_get_pull_request_diff`
- `github_get_pull_request_comments`
- `github_get_check_runs`
- `github_add_issue_comment`
- `github_add_review`
- `github_reply_to_review_comment`

**Why this matters:**
- lower prompt burden
- safer and more auditable than raw CLI strings
- better UX for review and CI workflows

#### 6. Add tool discovery

Codex has `tool_search` because large tool surfaces do not scale if the model has to remember every tool name and schema up front.

`companyhelm-ng` should add one of:
- a dedicated `tool_search` tool across product and connector tools
- namespaced tool summaries plus deferred loading

**Why this matters:**
- easier future expansion
- lower prompt size
- less up-front cognitive load

### Priority 2: Add optional but high-leverage tools

#### 7. Add approval-aware command execution

If CompanyHelm wants stronger human control over privileged actions, Codex's request-permissions pattern is worth borrowing.

**Possible tool pair:**
- `execute_command`
- `request_permissions`

This is especially useful if future environments allow network installs, deploy actions, or filesystem writes outside the main workspace.

#### 8. Add browser and image primitives when relevant

If CompanyHelm wants agents to work across UI tasks, frontend regression checks, or screenshot-driven debugging, Codex-style image and browser tools are a better fit than forcing shell-only workflows.

**Possible tools:**
- `view_image`
- browser navigation/screenshot primitives

#### 9. Add resource tools for company docs and runbooks

Codex separates local shell work from MCP resources and connector tools. CompanyHelm should eventually do the same for internal knowledge.

**Possible tools:**
- `list_company_resources`
- `read_company_resource`

This gives the agent a first-class way to read runbooks, policies, and reference docs without pretending everything is a web page or shell file.

---

## Tools to Reframe, Not Remove

### Keep `create_agent`, but narrow its role

`create_agent` is valuable for product administration, but it should not be the recommended way to delegate work. Persistent company agents and ephemeral task workers are different concepts and should have different tools.

### Keep `gh_exec`, but treat it as fallback

It is still useful for long-tail GitHub operations that structured tools do not yet support. It should sit behind richer GitHub tools, not in front of them.

### Keep `ask_human_question`, but reserve it for asynchronous workflows

It should be the durable escalation path, not the default "I need a quick answer" tool.

---

## Recommended Rollout Order

### Phase 1: Prompt and control-flow baseline

**Files:**
- modify `apps/api/src/templates/system_prompt.njk`
- extend `apps/api/src/prompts/system_prompt_template_context.ts`
- update `apps/api/src/services/agent/session/pi-mono/companyhelm_resource_loader.ts`

**Deliverables:**
- richer base prompt
- mode-aware prompt layering
- runtime fact expansion

### Phase 2: Planning, clarification, and ephemeral delegation

**Create:**
- `apps/api/src/services/agent/tools/planning/*`
- `apps/api/src/services/agent/tools/user_input/*`
- `apps/api/src/services/agent/tools/task_agents/*`

**Deliverables:**
- `update_plan`
- `request_user_input`
- ephemeral task-agent lifecycle tools

### Phase 3: Structured repo and GitHub tools

**Create:**
- `apps/api/src/services/agent/tools/repo/*`
- additional GitHub tool classes under `apps/api/src/services/agent/tools/github/*`

**Deliverables:**
- read/search repo helpers
- structured GitHub review and CI tools
- `gh_exec` repositioned as fallback

### Phase 4: Tool discovery and optional advanced capabilities

**Create:**
- `apps/api/src/services/agent/tools/discovery/*`
- optionally browser/resource tool providers

**Deliverables:**
- tool discovery
- deferred loading or namespaced tool metadata
- internal resource access and optional browser/image workflows

---

## Bottom Line

The biggest issue in `companyhelm-ng` is not that the current agent stack is missing power. It already has plenty of power through shell execution, patching, web search, durable admin tools, and raw `gh` execution. The issue is that the model is missing the Codex-style operating contract and the small structured tools that make that power usable.

The best Codex ideas to port first are:
- a real base prompt with execution, validation, and communication rules
- `update_plan`
- `request_user_input`
- ephemeral task-agent delegation
- structured repo read/search helpers
- richer GitHub tools with `gh_exec` as fallback

If `companyhelm-ng` adopts those changes, the agent behavior should become noticeably more reliable, less noisy, easier to supervise, and much less dependent on raw shell improvisation.
