---
name: deploy
description: Commit the current changes, push a branch, open a PR, and merge it. Manual invocation only (/deploy) — never runs automatically. Use when the user asks to deploy, ship, commit and push, or open/merge a PR for HomeBase.
---

# Deploy

Ships whatever is currently changed in the HomeBase repo: commit → push → PR → merge. This
skill only runs when explicitly invoked (`/deploy`) — never automatically on Stop or any other
event.

Note: despite the name, this skill does not deploy the app to any hosting environment (e.g.
Vercel) — it only handles the git/PR workflow. Actual deployment is tracked separately
(MAD-88).

**Current status: local checks, no CI.** Lint, type-check, tests, and a production build run
locally as a gate before anything ships (step 3 below) — a failure stops the skill before any
git state changes. A CI/CD pipeline (running the same checks on GitHub) is still a planned
addition; until it exists, these local checks are the only gate, so don't skip them.

## Steps

1. **Check for changes.** Run `git status` and `git diff` (staged + unstaged) to see what
   changed. If there's nothing to commit, say so and stop.

2. **Review before staging.** Look at the file list from `git status`. If anything looks like
   a secret or credential (`.env`, keys, tokens) that isn't already gitignored, flag it to the
   user before staging — do not silently commit it.

3. **Local checks.** Run, in order, stopping at the first failure:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm test`
   - `npm run build`

   If any step fails, stop here — report what failed and its output, and do not branch,
   commit, push, or open a PR. Fix the failure (or ask the user how they want to proceed) before
   retrying the skill from the top. Don't bypass a failing check unless the user explicitly says
   to ship anyway.

4. **Branch.** If currently on `main` (or `master`), create a new branch off it before
   committing — name it descriptively from the change (e.g. `feat/dashboard-layout`,
   `chore/update-readme`). Never commit directly to `main`.

5. **Commit.** Stage the relevant files (avoid a blanket `git add -A` if untracked files look
   unrelated to this change) and commit with a message describing *why*, following the repo's
   existing commit style once one exists.

6. **Push.** Push the branch to `origin` with upstream tracking (`git push -u origin <branch>`).

7. **Open a PR.** Use `gh pr create` with a concise title and a body summarizing what changed
   and why (short bullet points; a test plan section if there's anything meaningful to verify).

8. **Merge.** Use `gh pr merge --squash --delete-branch` to merge into `main` and clean up the
   branch. After merging, switch the local checkout back to `main` and pull so it's up to date.

9. **Report** the PR URL and confirm it merged.

## Notes

- This is a solo-maintainer repo with no required status checks yet, so merge happens
  immediately after PR creation rather than waiting on review — that's expected for now, not a
  shortcut being taken.
- If `gh pr merge` fails (e.g. a branch protection rule appears later requiring checks or
  review), stop and report the failure rather than forcing the merge.
