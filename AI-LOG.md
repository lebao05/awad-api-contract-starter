# AI-LOG.md — template (CSC13114)

Copy this file into the root of your team repository and keep it up to date.
Every submission in this course includes it.

## How to use it

- One entry per task where an assistant did part of the work, and **one
AI-LOG.md with every project milestone** (`PA#1`–`PA#5`).
- Three honest lines are enough. This is an account, not a transcript.
- Write it as you go. Reconstructing it the night before never reads true.
- Declaring heavy use costs you nothing. A team that declares 80% and can
explain all of it scores higher than a team that declares nothing and freezes
at the oral.

## The five rules, in short

1. AI is allowed and encouraged in every assignment. Only the final exam is
written without it.
2. Declare it here.
3. You own the code. "The AI wrote it" is not a defence.
4. You will be asked. Anything you cannot explain scores zero, even if it runs.
5. No secrets in prompts: no API keys, no real user data, no classmate's work.
6. For the LLM feature inside your own product, say what data leaves your
system and why that is acceptable.

## Entry format

```md
## <YYYY-MM-DD> — <what you were working on>
Tool: <Claude Code / Copilot / Cursor / something else / none>
Asked for: <the task you gave it, in one sentence>
Kept: <what you took as it came>
Changed: <what you rewrote, and why>
Rejected: <what you threw away, and why>
```

`Changed` and `Rejected` are the two lines we read most closely: what the assistant got wrong, and which check caught it. "Nothing went wrong" is a fine entry if it says what you ran.

## A filled example

```md
## 2026-10-09 — feature spec (IA#1)
Tool: Claude Code.
Asked for: a first draft of the acceptance criteria from my Flow section.
Kept: the three-way split arithmetic criterion.
Changed: its criteria said "works correctly" — rewrote each one with concrete
values so it can fail.
Rejected: its refund flow. Refunds are a non-goal; I wrote that line instead.

## 2026-10-10 — eval for the summarise feature
Tool: none — the failure cases are the point of the exercise.
```

## What a weak log looks like

```md
## Week 3
Used AI for the frontend. Fixed some things.
```

It says nothing we can check, and nothing that helps you at the oral. If a task
took you three hours of argument with a tool, that story is worth one line — it
is evidence you were in control.