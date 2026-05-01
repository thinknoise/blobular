# AGENTS.md

This project is Blobular, a React/TypeScript/Web Audio experiment.

Use this guidance when changing code in this repo.

## Main rule

Make the requested change with the smallest reasonable code movement. Do not rewrite working code just to make it prettier.

## Project shape

Blobular has two important layers:

1. The audio behavior: buffers, grains, playback, timing, parameter changes, and audio-node wiring.
2. The React interface: controls, panels, display state, user input, and visual feedback.

Keep those layers separate when possible. React can control parameters, but React render cycles should not be treated as the audio timing engine.

## Code rules

- Separate behavior changes from cleanup.
- Do not refactor unrelated code unless it blocks the task.
- Prefer clear TypeScript over clever TypeScript.
- Do not use `any`, blind `as SomeType` casts, or non-null assertions just to silence TypeScript.
- Keep helpers near the feature until there is a real second use case.
- Do not introduce new dependencies without asking first.
- Respect the styling system already in the project.
- Do not convert styling to vanilla-extract, SCSS, CSS Modules, or anything else unless the task is specifically about that.
- Keep CSS specificity low.
- Avoid `!important` unless there is a documented reason.
- Comments should explain why, not what.

## Audio-specific rules

- Keep timing assumptions explicit.
- Keep audio-engine logic outside display components when practical.
- Parameter controls may live in React, but audio behavior should live in audio-focused helpers, hooks, or engine modules.
- Do not let UI cleanup accidentally change sound behavior.

## Testing and checks

When possible, run the relevant check after making changes:

- typecheck
- lint
- tests
- build

If a command is missing or fails for an existing reason, explain that clearly.

## Codex behavior

Before making broad changes, propose a short plan.

For refactors, keep the diff small and focused.

For reviews, point out risks and options before editing.

After creating the file, do not make any other changes. Show me the diff.

## Refactor mode

Small changes are preferred for normal tasks, but do not avoid real refactors when the code needs them.

When asked for a deeper refactor pass:

- inspect the relevant feature area, not just the current file
- say clearly if the code is already fine
- identify actual coupling, duplication, invalid states, or hard-to-test logic
- refactor the problem directly
- keep behavior the same unless a bug is being fixed
- do not create work just to satisfy a rule
- do not make cosmetic churn
- explain what changed and what stayed the same
