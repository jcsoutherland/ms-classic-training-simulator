# MS Classic Training Simulator

A free website for **MapleStory Classic World** players. They give it their character (screenshots or typed in), pick a
map and a number of hours, and it predicts their kills, EXP, mesos and item drops. It can also rank every map that suits
their character by EXP per hour or mesos per hour, either solo or as a party of identical characters.

It is a static site (React + Vite + TypeScript) hosted on GitHub Pages. All game data is extracted ahead of time into
this repo, so the site never needs a server and never asks the fan sites for anything while someone is using it.

Read these before starting any work:

- [docs/PROJECT_OUTLINE.md](docs/PROJECT_OUTLINE.md): the full plan, every decision made so far, and the formulas.
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md): where each piece of data comes from, what we checked, and the known gaps.

## Important
- **Private by default.** No accounts, no servers and no analytics. Player data stays on their own computer.
- **A good neighbour.** The community fan sites we get game data from are free resources. Never add load to them:
  read from our own mirror first.
- **Plain language.** Everything a player sees is in friendly, everyday words that tell them what to do next.

## Code Style

- Functions should do one thing. If you need the word "and" to describe it, split it.
- Name variables after what they contain, functions after what they do.
- Don't abbreviate names. `getUserProfile` not `getUsrProf`. Clarity beats brevity.
- No commented-out code. Delete it. Git remembers.
- Handle errors explicitly. Don't swallow exceptions or ignore error returns.
- Keep files under 300 lines. If a file is growing, extract a module.
- Imports go at the top, grouped: stdlib, external packages, internal modules.
- Prefer small, focused functions.
- Use early returns over nested conditionals.
- Keep code simple. No over-engineering.
- No unnecessary comments or docstrings.

## Testing

- Write tests that verify behavior, not implementation details.
- Each test should have one clear assertion. Name it after what it proves.
- Use `describe` blocks to group related tests. Use `it` or `test` for individual cases.
- Test the public API of modules, not internal functions.
- Prefer real dependencies over mocks. Only mock external services (APIs, databases).
- Every bug fix must include a regression test that fails without the fix.
- Run the full test suite before marking any task complete.

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).
- If something goes sideways, STOP and re-plan immediately. Don't keep pushing.
- Use plan mode for verification steps, not just building.
- Write detailed specs upfront to reduce ambiguity.

### 2. Subagent Strategy
- Use subagents liberally to keep the main context window clean.
- Offload research, exploration and parallel analysis to subagents.
- For complex problems, throw more compute at it via subagents.
- One task per subagent for focused execution.

### 3. Self-Improvement Loop
- After ANY correction from the user, update CLAUDE.md with a rule to prevent the same mistake.
- Write rules for yourself that are specific and actionable.
- Ruthlessly iterate on these rules until the mistake rate drops.

### 4. Verification Before Done
- Never mark a task complete without proving it works.
- Diff behavior between `main` and your changes when relevant.
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness.
- After finishing a task, run typecheck, tests and lint before calling it done.

### 5. Demand Elegance (Balanced)
- For non-trivial changes, pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution."
- Skip this for simple, obvious fixes. Don't over-engineer.
- Challenge your own work before presenting it.

### 6. Autonomous Bug Fixing
- When given a bug report, just fix it. Don't ask for hand-holding.
- Point at logs, errors and failing tests, then resolve them.
- Zero context switching required from the user.
- Go fix failing CI tests without being told how.

## Task Management

1. **Plan First:** write a plan with checkable items before coding.
2. **Verify Plan:** check in with the user before starting implementation.
3. **Track Progress:** mark items complete as you go.
4. **Explain Changes:** give a high-level summary at each step.
5. **Document Results:** note what was done and any follow-ups needed.
6. **Capture Lessons:** update CLAUDE.md after corrections.

## Core Principles

- **Simplicity First:** make every change as simple as possible, with minimal code impact.
- **No Laziness:** find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** changes should only touch what's necessary. Avoid introducing bugs.

## Preferences

- Ask before committing to git.
- Prefer editing existing files over creating new ones.
- Run tests after making changes.
- Ask the user before using any outside resource (website or game folder) to check it is the right place for what you need.

## Lessons learned
<!-- Claude adds a rule here after each correction (see Self-Improvement Loop). -->
- When interviewing the user about a plan, ask one question per message and don't offer a recommended or example answer.
- Keep pages dense: the key numbers for a page should fit in one screen at 1080p. Don't add captions or summary lines
  that repeat numbers shown elsewhere on the page.
- All buttons share one shape (the `.button` corners). Don't introduce round pills or other button styles.
- Characters save as the player edits. Don't add Save buttons.
- When the user asks for options on a layout, show visual mockups to pick from rather than describing them.
