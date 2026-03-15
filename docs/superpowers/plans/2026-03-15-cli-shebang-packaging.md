# CLI Shebang Packaging Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the published CLI entrypoint executable via `npx` on Unix by ensuring the built `dist/cli.js` includes a Node shebang.

**Architecture:** Add the shebang at the source entrypoint so TypeScript emits it into `dist/cli.js`, then protect that behavior with a smoke test that reads the built artifact. Keep the change local to the package entrypoint and existing smoke-test coverage.

**Tech Stack:** TypeScript, Node.js, Vitest, npm packaging

---

### Task 1: Lock the Packaging Regression with a Failing Test

**Files:**
- Modify: `tests/unit/package-smoke.test.ts`
- Test: `tests/unit/package-smoke.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("built cli entrypoint includes a node shebang", () => {
  const cliFile = readFileSync("dist/cli.js", "utf8");
  expect(cliFile.startsWith("#!/usr/bin/env node")).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/package-smoke.test.ts`
Expected: FAIL because `dist/cli.js` starts with `import`, not a shebang.

### Task 2: Emit the Shebang from the CLI Entrypoint

**Files:**
- Modify: `src/cli.ts`
- Test: `tests/unit/package-smoke.test.ts`

- [ ] **Step 1: Write minimal implementation**

```ts
#!/usr/bin/env node
```

- [ ] **Step 2: Run targeted test to verify it passes**

Run: `npm test -- tests/unit/package-smoke.test.ts`
Expected: PASS

### Task 3: Verify Packaging and Runtime Behavior

**Files:**
- Modify: `src/cli.ts`
- Test: `tests/unit/package-smoke.test.ts`

- [ ] **Step 1: Run focused verification**

Run: `npm test -- tests/unit/package-smoke.test.ts tests/unit/register-commands.test.ts tests/integration/up-command.test.ts`
Expected: PASS

- [ ] **Step 2: Rebuild and retest the packaged CLI manually**

Run: `npx @companyhelm/cli@0.1.5 --help`
Expected: Current published package still fails until a new release is cut.

Run: `node dist/cli.js up --help`
Expected: PASS
