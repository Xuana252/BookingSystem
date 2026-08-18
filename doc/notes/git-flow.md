# Git Branching Strategies

**Status:** Applied in project
**OJT tracker category:** Process

## Summary

Three common branching models trading off structure vs. speed: Git Flow (heavyweight, versioned
releases), GitHub Flow (lightweight, continuous deploy), and Trunk-Based Development (fastest,
needs mature CI/CD).

## Key Concepts

- **Git Flow** — two permanent branches (`main`, `develop`) plus supporting branch types
  (`feature/*`, `release/*`, `hotfix/*`). Best for scheduled, versioned releases.
- **GitHub Flow** — one long-lived branch (`main`, always deployable) plus short-lived feature
  branches merged via PR. No `develop`, no version staging.
- **Trunk-Based Development** — everyone commits to a single shared branch very frequently;
  incomplete work hidden behind feature flags instead of long-lived branches.
- **Core tradeoff:** Git Flow trades speed for structure and safety nets. GitHub Flow and
  trunk-based trade structure for speed, relying on fast rollback and feature flags to catch
  problems in production.

## Reference / Cheatsheet

### Git Flow — core branches

- **main** (`master`) — always production-ready; every commit is a released version
- **develop** — integration branch where features come together between releases

### Git Flow — supporting branches

| Branch type | Branches from | Merges into | Naming | Purpose |
|---|---|---|---|---|
| Feature | `develop` | `develop` | `feature/*` | New feature development |
| Release | `develop` | `main` + `develop` | `release/*` | Release prep — fixes, docs, version bumps (no new features) |
| Hotfix | `main` | `main` + `develop` | `hotfix/*` | Emergency production fixes |

### Typical Git Flow release

```bash
# 1. Branch from develop
git checkout -b release/1.2.0 develop

# 2. Release prep (bug fixes, version bump, docs — no new features)
git commit -am "Bump version to 1.2.0"
git commit -am "Fix minor bug found during testing"

# 3. Merge into main and tag
git checkout main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release 1.2.0"

# 4. Merge back into develop (so develop gets fixes made during release prep)
git checkout develop
git merge --no-ff release/1.2.0

# 5. Clean up
git branch -d release/1.2.0

# 6. Push
git push origin main develop --tags
```

### Tagging commands

```bash
git tag -a v1.2.0 -m "Release version 1.2.0"   # annotated tag (recommended)
git tag v1.2.0                                  # lightweight tag
git push origin v1.2.0                          # push one tag
git push origin --tags                          # push all tags
git tag                                         # list tags
git tag -l "v1.2.*"                             # filter tags
git show v1.2.0                                 # show tag details
git tag -d v1.2.0                               # delete local tag
git push origin --delete v1.2.0                 # delete remote tag
```

### GitHub Flow

```bash
git checkout -b feature/login main
# commit, commit, commit
git push origin feature/login
# open PR → review → merge into main
# main deploys immediately (often automatically)
```

### Trunk-Based Development

```bash
git checkout -b quick-fix main   # lives hours, not days
git commit -am "small change"
git push origin quick-fix
# merge back same day, or commit directly to main
```

### Comparison table

| | Git Flow | GitHub Flow | Trunk-Based Dev |
|---|---|---|---|
| Branches | `main`, `develop`, `feature/*`, `release/*`, `hotfix/*` | `main` + short-lived feature branches | `main` (+ very short-lived branches) |
| Complexity | High | Low | Lowest |
| Deploy from | `main` (after release process) | `main` (every merge) | `main` (continuously) |
| Release cycle | Scheduled/versioned | Continuous | Continuous |
| Long-lived branches | Yes (`main`, `develop`) | No | No |

### When to use which

- **Git Flow** — versioned software, mobile apps (app-store review delays), multiple production
  versions supported simultaneously, scheduled release cycles.
- **GitHub Flow** — continuously deployed web apps/APIs, small-medium teams, PR-based review
  without heavy process.
- **Trunk-Based** — large teams, high-frequency deploys, mature CI/CD and testing culture,
  avoiding merge conflicts at scale.

Many teams today land in between: `main` + short feature branches + PRs + feature flags — Git
Flow's discipline without the full ceremony, unless multi-version support is specifically needed.

## Applied In This Project

A lightweight version of Git Flow — its core branches, without the full release/hotfix ceremony
(no versioned releases needed for an OJT project):
- `main` — stable; only ever fast-forwarded/merged from `develop`.
- `develop` — integration branch; every phase's work lands here.
- `feature/*` branches per unit of work, merged into `develop` with `--no-ff` so each feature's
  history stays visible as a block (e.g. `feature/phase1-foundations`,
  `feature/application-layer`).
- No `release/*` or `hotfix/*` branches yet, and no tags — not needed at this project's scale
  (single deployable target, no versioned releases).

## Open Questions / Next Steps

- Revisit whether tagging sprint milestones (`v0.1-phase1`, etc.) would be useful for the OJT
  presentation checkpoints.
