# Commit and Review Policy

## Plans are broken down into commits

- Every implementation plan must be decomposed into a sequence of small, logical commits.
- Each commit is one behavior or one slice of scaffolding — coherent on its own and,
  where practical, individually reviewable and revertable.
- Tests for a behavior live in the same commit as that behavior (see
  [coding-standards.md](coding-standards.md)).
- Use [Conventional Commits](https://www.conventionalcommits.org/) messages
  (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, …). Release automation
  derives the changelog and version from these (see [release-process.md](release-process.md)).

## Stop before committing — always

- **Agents must stop before every commit and wait for explicit review and approval.**
  Do not run `git commit` (or `git push`) until the human has reviewed the staged
  increment and confirmed.
- Present each increment for review as: what changed, why, and what is covered by tests.
- Reviewing increment by increment is intentional — it keeps changes understandable
  and lets the reviewer follow how each step builds on the last. Do not batch
  multiple planned commits together to "save time."
- This rule applies even when the change looks trivial.

## Review quality

- Explain behavioral changes, not just file changes.
- Call out test coverage and known risks.
- Keep follow-up work isolated from unrelated cleanup.

## Baseline exception

- The first baseline commit is direct and does not need a pull request.
