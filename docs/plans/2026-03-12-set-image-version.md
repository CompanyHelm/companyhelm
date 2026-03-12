# Set Image Version Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive `set-image-version` command that pulls available public image tags from Amazon ECR Public, writes the selected image reference into a local `config.yaml`, and makes `up`/`status` read those pinned image values.

**Architecture:** Keep the runtime image defaults in code, add a small local config store rooted at the current working directory, and introduce a public-registry tag client that uses the anonymous bearer-token flow exposed by `public.ecr.aws`. Model the command flow after `companyhelm-infra`: prompt for service, show the current configured image, list recent tags, prompt for a selection, then persist the chosen image reference.

**Tech Stack:** Node 24, TypeScript, `commander`, Node `fetch`, Node `readline/promises`, `vitest`.

---

### Task 1: Add image metadata and local config persistence

**Files:**
- Create: `src/core/runtime/ManagedImages.ts`
- Create: `src/core/runtime/LocalConfigStore.ts`
- Modify: `src/core/runtime/ImageCatalog.ts`
- Test: `tests/unit/local-config-store.test.ts`

**Step 1: Write the failing config-store tests**

Write tests that verify `config.yaml` round-trips `images.api` and `images.frontend`, and that `ImageCatalog` prefers configured images over defaults.

**Step 2: Run the targeted tests to verify failure**

Run: `npm test -- --run tests/unit/local-config-store.test.ts tests/unit/dependencies.test.ts`
Expected: FAIL because the config store and new image resolution path do not exist yet.

**Step 3: Implement the config store and image metadata**

Add shared service metadata for `api` and `frontend`, a `LocalConfigStore` that reads/writes `config.yaml` in the current working directory, and teach `ImageCatalog` to resolve image pins from that file.

**Step 4: Run the targeted tests to verify pass**

Run: `npm test -- --run tests/unit/local-config-store.test.ts tests/unit/dependencies.test.ts`
Expected: PASS for the new config-store behavior.

**Step 5: Commit**

```bash
git add src/core/runtime/ManagedImages.ts src/core/runtime/LocalConfigStore.ts src/core/runtime/ImageCatalog.ts tests/unit/local-config-store.test.ts tests/unit/dependencies.test.ts
git commit -m "feat: add local image pin config"
```

### Task 2: Add public tag lookup and the interactive command

**Files:**
- Create: `src/core/runtime/PublicImageTagRegistry.ts`
- Create: `src/commands/set-image-version.ts`
- Modify: `src/commands/register-commands.ts`
- Modify: `src/cli.ts`
- Modify: `package.json`
- Test: `tests/unit/public-image-tag-registry.test.ts`
- Test: `tests/unit/set-image-version.test.ts`
- Test: `tests/unit/register-commands.test.ts`

**Step 1: Write the failing command and registry tests**

Add tests for anonymous token + tag list parsing, the interactive selection flow, and the expanded command surface.

**Step 2: Run the targeted tests to verify failure**

Run: `npm test -- --run tests/unit/public-image-tag-registry.test.ts tests/unit/set-image-version.test.ts tests/unit/register-commands.test.ts`
Expected: FAIL because the registry and command do not exist yet.

**Step 3: Implement the registry client and command**

Use the ECR Public token endpoint and `tags/list` endpoint to fetch available tags, then implement `set-image-version` with interactive prompts similar to infra.

**Step 4: Run the targeted tests to verify pass**

Run: `npm test -- --run tests/unit/public-image-tag-registry.test.ts tests/unit/set-image-version.test.ts tests/unit/register-commands.test.ts`
Expected: PASS for the new command flow.

**Step 5: Commit**

```bash
git add src/core/runtime/PublicImageTagRegistry.ts src/commands/set-image-version.ts src/commands/register-commands.ts src/cli.ts package.json tests/unit/public-image-tag-registry.test.ts tests/unit/set-image-version.test.ts tests/unit/register-commands.test.ts
git commit -m "feat: add interactive image pinning command"
```

### Task 3: Document and verify the end-to-end behavior

**Files:**
- Modify: `README.md`
- Modify: `tests/unit/readme.test.ts`

**Step 1: Update the README**

Document `npx @companyhelm/cli set-image-version`, the local `config.yaml`, and the equivalent `npm run set-image-version` script.

**Step 2: Run the relevant tests**

Run: `npm test -- --run tests/unit/readme.test.ts tests/unit/dependencies.test.ts tests/unit/register-commands.test.ts`
Expected: PASS with the new command/config documentation reflected.

**Step 3: Run the broader verification**

Run: `npm test -- --run tests/unit`
Expected: PASS, or isolate any unrelated pre-existing failures before claiming success.

**Step 4: Commit**

```bash
git add README.md tests/unit/readme.test.ts docs/plans/2026-03-12-set-image-version.md
git commit -m "docs: document image pinning flow"
```
