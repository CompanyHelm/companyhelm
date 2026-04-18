# GitHub repository write workflow

This runtime should treat local git branch and commit work as the default authoring path for CompanyHelm repositories.

## Standard path

1. Use `list_github_installations` to confirm the installation id and repository name.
2. Use `clone_github_repository` to create the local checkout.
3. Create a local branch with git.
4. Edit files and run verification commands locally.
5. Commit locally. Fresh E2B environments should already include a safe default git identity.
6. Use `push_github_branch` to publish the branch with a fresh installation token injected only into that push command.
7. Use `create_github_pull_request` to open the PR.

## Why this is the default

- keeps the main edit flow in the repository instead of piecemeal API file writes
- avoids persisting installation tokens into git remotes or repo config
- removes the need for manual local git identity repair before the first commit

## Fallback guidance

Use `gh_exec` when a GitHub CLI operation falls outside the structured tools. Examples include niche repository settings or metadata operations that are not part of the routine branch-write path.

Use direct GitHub API mutation only as a fallback when the standard local branch, commit, push, and PR path is blocked. API mutation should not be the default for routine code changes.

## Lightweight checklist for repo write actions

- Confirm the target installation id and repository name.
- Clone the repo through `clone_github_repository`.
- Create a local branch before editing.
- Run local verification before pushing.
- Commit locally.
- Publish the branch with `push_github_branch`.
- Open the PR with `create_github_pull_request`.
- Reach for `gh_exec` or API fallback only if the structured path cannot complete the task.
