---
name: ship
description: Commit the current changes, push a branch, open a PR, and merge it. Manual invocation only (/ship) — never runs automatically. Use when the user asks to ship, commit and push, or open/merge a PR for HomeBase.
---

# Ship

Ships whatever is currently changed in the HomeBase repo: commit → push → PR → merge. This
skill only runs when explicitly invoked (`/ship`) — never automatically on Stop or any other
event.

**Current status: no gates.** This skill does not yet run linting, type-checking, tests, or
CI. It ships whatever is in the working tree as-is. Local checks, a unit test suite, and a
CI/CD pipeline are planned additions — when those exist, run them here and stop on failure
before continuing to commit/push/PR/merge.

## Steps

1. **Check for changes.** Run `git status` and `git diff` (staged + unstaged) to see what
   changed. If there's nothing to commit, say so and stop.

2. **Review before staging.** Look at the file list from `git status`. If anything looks like
   a secret or credential (`.env`, keys, tokens) that isn't already gitignored, flag it to the
   user before staging — do not silently commit it.

3. **Branch.** If currently on `main` (or `master`), create a new branch off it before
   committing — name it descriptively from the change (e.g. `feat/dashboard-layout`,
   `chore/update-readme`). Never commit directly to `main`.

4. **Commit.** Stage the relevant files (avoid a blanket `git add -A` if untracked files look
   unrelated to this change) and commit with a message describing *why*, following the repo's
   existing commit style once one exists.

5. **Push.** Push the branch to `origin` with upstream tracking (`git push -u origin <branch>`).

6. **Open a PR.** Use `gh pr create` with a concise title and a body summarizing what changed
   and why (short bullet points; a test plan section if there's anything meaningful to verify).

7. **Merge.** Use `gh pr merge --squash --delete-branch` to merge into `main` and clean up the
   branch. After merging, switch the local checkout back to `main` and pull so it's up to date.

8. **Report** the PR URL and confirm it merged.

## Notes

- This is a solo-maintainer repo with no required status checks yet, so merge happens
  immediately after PR creation rather than waiting on review — that's expected for now, not a
  shortcut being taken.
- If `gh pr merge` fails (e.g. a branch protection rule appears later requiring checks or
  review), stop and report the failure rather than forcing the merge.
