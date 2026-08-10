# Spec Kit

**Status:** Research only (not yet built)
**OJT tracker category:** AI

## Summary

Spec Kit is a free, open-source toolkit from GitHub for Spec-Driven Development (SDD) — a
workflow where you write a structured specification first, then let an AI coding agent (e.g.,
Claude Code) turn that spec into working code, rather than prompting the agent ad hoc.

- **Publisher:** GitHub (`github/spec-kit`)
- **License:** MIT / open-source — free to use
- **Distribution:** CLI tool called `specify-cli`

## Key Concepts

Instead of jumping straight into code, you build up a chain of structured artifacts that the AI
agent reads at each stage:

1. **Constitution** — project's governing principles (code quality, testing, consistency)
2. **Spec** — *what* to build and *why* (not tech stack)
3. **Clarify** *(optional)* — structured Q&A to resolve ambiguity before planning
4. **Plan** — tech stack and architecture
5. **Tasks** — concrete implementation task breakdown
6. **Analyze** *(optional)* — consistency check across spec/plan/tasks
7. **Implement** — agent writes the actual code

## Reference / Cheatsheet

### Install

```bash
pip install specify-cli
# or: uv tool install specify-cli
# or: pipx install specify-cli
```

### Setup with Claude Code

```bash
pip install specify-cli
specify init my-project --ai claude
cd my-project
claude
```

### Slash commands (in Claude Code)

`/speckit.constitution` → `/speckit.specify` → `/speckit.clarify` → `/speckit.plan` →
`/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`

- **Shorter path** (small features): specify → plan → tasks → implement
- **Full path** (production features): adds constitution, clarify, checklist, analyze as quality
  gates

### Cost notes

- **Spec Kit itself:** $0 — free and open-source
- **Claude Code access:** included in existing Claude Pro/Max subscription, no separate fee
- **Pro plan (~$20/mo):** ~45 prompts per 5-hour window, Sonnet only (no Opus)
- **Token usage:** scales with scope — small, single-purpose features (~6–10 prompts total) fit
  comfortably within a Pro session; large multi-service pipelines or vague specs needing multiple
  clarify rounds burn through the window much faster

### Key takeaway

Spec Kit turns AI-assisted coding into a structured contract-first process. Best practice: keep
specs narrow and scoped per feature (one branch per feature) rather than one giant sprawling spec
— cheaper on tokens and produces cleaner, more reviewable output.

## Applied In This Project

Not applied — per the OJT plan, Spec Kit is a Sprint 3 research topic ("reading, not build
targets for BookingSystem"). This project has instead been built through an ordinary
conversational plan-then-implement flow with Claude Code (see the phase plan and
`doc/phase-outputs/`), not Spec Kit's structured constitution/spec/plan/tasks artifact chain.

## Open Questions / Next Steps

- Could be worth a small side experiment later: run one narrow feature through the actual
  Spec Kit CLI to compare the artifact-driven flow against how this project has been built so
  far, for the Sprint 3 presentation.
