# Computer Screenshot Image Content Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `computer_screenshot` emit a generic image content block so the transcript UI can render it without tool-specific handling.

**Architecture:** Keep the change tool-agnostic by updating only the screenshot tool result shape. The session event handler and chat UI already persist and render generic `image` content blocks, so the only code change needed is the tool output contract plus focused regression coverage.

**Tech Stack:** TypeScript, Vitest, PI Mono tool definitions, React transcript renderer

---

### Task 1: Change screenshot tool output

**Files:**
- Modify: `apps/api/src/compute/e2b/tools/computer-use/screenshot.ts`
- Modify: `apps/api/src/compute/e2b/tools/computer-use/result_formatter.ts`

**Step 1: Update the tool content block**

Return one `image` content item with `data` and `mimeType` instead of a text block.

**Step 2: Remove obsolete screenshot text formatting**

Delete the screenshot formatter method that referenced `details.base64EncodedPng`.

### Task 2: Verify the contract

**Files:**
- Create: `apps/api/tests/agent_compute_e2b_computer_use_screenshot_tool.test.ts`

**Step 1: Add a focused unit test**

Assert that `computer_screenshot` returns:
- `content[0].type === "image"`
- `content[0].mimeType === "image/png"`
- screenshot bytes only in the generic image block, not in tool-specific details

**Step 2: Run focused verification**

Run:
- `npm exec -w @companyhelm/api -- eslint src/compute/e2b/tools/computer-use/screenshot.ts src/compute/e2b/tools/computer-use/result_formatter.ts tests/agent_compute_e2b_computer_use_screenshot_tool.test.ts`
- `npm exec -w @companyhelm/api -- vitest run tests/agent_compute_e2b_computer_use_screenshot_tool.test.ts tests/pi_mono_session_event_handler.test.ts`
