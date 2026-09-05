# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository. See [AGENTS.md](./AGENTS.md) for the full guide (project overview, dev commands,
architecture, testing conventions, known-fixed bugs) — it applies equally here and is kept as the
single source of truth so the two files don't drift.

One Claude-Code-specific note: a `dom-views-internals` skill exists under `.claude/skills/` with
the same architecture/testing content as `AGENTS.md`, kept in sync — load it when auditing or
extending `src/observer.ts`/`src/view.ts` rather than re-deriving the design from scratch.
