# Contributing Guidelines

## Branch Naming

All branches should be named using the following convention:

```
<JIRA_TICKET>-short-description
```

- Example: `RMS-23-adding-new-feature`
- Use lowercase and hyphens for the description.
- The `<JIRA_TICKET>` should match the ticket number from your project management system (e.g., `RMS-23`).

## Commit Message Format

All commit messages should follow this format:

```
[<JIRA_TICKET>]: Short description of the change
```

- Example: `[RMS-23]: Adding new feature`
- The description should be concise and use sentence case.
- If your commit addresses multiple tickets, you can list them: `[RMS-23][RMS-24]: Fix bugs and add tests`

## Contribution Flow (Pushing to Master)

1. **Create a feature branch** from `master`:
   ```
   git checkout -b RMS-23-adding-new-feature
   ```
2. **Make your changes** and stage them:
   ```
   git add .
   ```
3. **Commit your changes** with a descriptive message:
   ```
   git commit -m "[RMS-23]: Adding new feature"
   ```
4. **Always rebase your branch from `master` before pushing:**
   ```
   git fetch origin
   git rebase origin/master
   # Resolve any conflicts, then continue the rebase
   ```
5. **Push your branch** to the remote repository (force push if you rebased):
   ```
   git push origin RMS-23-adding-new-feature
   # If you rebased:
   git push --force-with-lease origin RMS-23-adding-new-feature
   ```
6. **Open a Pull Request (PR)** from your branch to `master`.
7. **Request review and approval** from at least one other team member.
8. **After approval, merge the PR** into `master` (do not push directly to `master`).

> **Note:** Always make sure your branch is up to date with `master` before pushing and opening a PR. This helps avoid merge conflicts and ensures a clean history.

---

Thank you for contributing! Please follow these conventions to keep the repository organized and traceable.
