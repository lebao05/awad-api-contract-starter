Individual assignment · 100 points · 2% of the course. Started in the room (slides 22–23), finished at home. The rubric is attached — read it before you start.

1. Clone github.com/fithcmus/awad-api-contract-starter (Node 22.13+, no dependencies).
2. npm run migrate && npm run seed && npm test && npm run contract — legacy green, contract 0 of 29.
3. Read CONTRACT.md for ten minutes, without the agent. Start NOTES.md: the two sentences you expect the agent to get wrong, and why. Commit NOTES.md before the agent touches src/.
4. Prompt your agent with the paragraph in the README. Before fixing anything: npm run contract 2>&1 | tee contract-run-1.txt — and commit it.
5. Get to green by giving the agent test names and contract sections, not test code. Save contract-run-final.txt.
6. Ask the agent which sentences could be read two ways and what it chose. Decide each one in NOTES.md.

Do not edit test/ or CONTRACT.md: an edited test scores 0 on criteria 1 and 2. We re-run the tests on your repository ourselves.

Turn in by Thursday, November 12, 2026, 22:00, from your <StudentID>@student.hcmus.edu.vn account: one zip of your starter repository including .git, named <StudentID>_<self-assessed total>.zip (e.g. 23127001_82.zip), containing your /v1 code, contract-run-1.txt, contract-run-final.txt, NOTES.md, AI-LOG.md and SELF_ASSESSMENT_REPORT.md — all written in English.
IA#3 — API contract: the agent implements it, the
tests judge · rubric
Class 23KTPM1
CSC13114 · individual assignment · 2% of the course · 100 points
Session 5, started in the room and finished at home. Start from the starter repository linked in
this assignment ( github.com/fithcmus/awad-api-contract-starter ). Its README.md gives the
steps; CONTRACT.md is the specification your agent implements.
Use your assistant. Nothing in this assignment asks you to type code yourself: it scores what
the API does, what you predicted and checked before you trusted the agent, and how you
handled the sentences of the contract that could be read two ways.
Due Thursday, November 12, 2026, 22:00. Done alone — this is not team work. Write
NOTES.md , AI-LOG.md and SELF_ASSESSMENT_REPORT.md in English.
What you hand in
One zip of your repository, including .git , so that the order of your commits can be read. A
history rebased, squashed or rebuilt after the work was finished does not count as commit
order: criteria 3 and 4 then score at their levels for predictions written after the first run and for
a contract-run-1.txt re-run after fixes. It must contain:
File What it is
src/v1.js , src/app.js ,
migrations/002_*

the /v1 implementation your agent wrote, with your
fixes

contract-run-1.txt npm run contract 2>&1 \| tee contract-run-1.txt — the

agent's first attempt, before any fix
contract-run-final.txt the same command after your last fix
NOTES.md your predictions, the failures and the ambiguous

sentences (criteria 3–5)
AI-LOG.md as for every assignment
SELF_ASSESSMENT_REPORT.md see How to submit
Leave out node_modules/ (there is none) and data/ .
What is scored
# Criterion Points
1 The contract tests pass 30
2 The rules were kept 10
3 Predictions, made before the agent ran 10

# Criterion Points
4 The first run, read line by line 20
5 The sentences that could be read two ways 20
6 AI-LOG.md 10

1. The contract tests pass — 30 points
We unzip your repository and run npm run migrate && npm run seed && npm test && npm run
contract on Node 22.13 or later. The score comes from our run; contract-run-final.txt must
match it.
Points What it looks like
30 Legacy 3 of 3 and contract 29 of 29, and contract-run-final.txt shows the same.
20–29 Legacy 3 of 3, contract 25–28 of 29. One point fewer for each failing test below 29.
10–19 Legacy 3 of 3, contract 15–24 of 29.
0–9 Fewer than 15 contract tests pass, the legacy tests fail, or the service does not

start.

If our run and contract-run-final.txt disagree, we score our run and say so in the feedback.
2. The rules were kept — 10 points
Checked with git diff against the starter commit.
Points What it looks like
10 Nothing under test/ and nothing in CONTRACT.md changed. Every new table is in a

new migrations/002_*.up.sql with a matching .down.sql .

5–9 One of: a new table created outside a migration, or a migration with no down .
0 test/ or CONTRACT.md was changed — and criterion 1 is then scored 0 as well,
since a test that was edited to pass no longer judges anything. If you think a test or
the contract is wrong, write it in NOTES.md : that is a finding, not a failure.

3. Predictions, made before the agent ran — 10 points
Points What it looks like
9–10 NOTES.md names two sentences of CONTRACT.md , quoted or with their section
number, that you expected the agent to get wrong, each with a reason. The
commit that adds them comes before the first commit that changes src/ . At the
end, one line per prediction says whether it came true.

5–8 Two predictions, but one has no reason, or the outcome is not recorded.

Points What it looks like
1–4 Predictions written after the first run (the commit order shows it), or only one.
0 None.

4. The first run, read line by line — 20 points
Points What it looks like
17–20 contract-run-1.txt is committed before any commit that fixes src/ after the
agent's first attempt. NOTES.md has one line per test that failed in it: the
sentence of the contract, what the agent did instead, and — when the sentence
could be read two ways — the wording you would change it to.

11–16 Every failure has a line, but some only repeat the test name without saying what

the agent did.

4–10 Only some failures are explained, or contract-run-1.txt was clearly re-run after
fixes (fewer failures than the commits show).
0–3 No contract-run-1.txt , or no explanation of it.
If the agent's first attempt passed all 29 tests, say so: this criterion is then scored on criterion
5's list instead — pick the three points the agent said it guessed at and explain each one the
same way.
5. The sentences that could be read two ways — 20 points
You asked the agent: "Which sentences of CONTRACT.md could be read two ways, and what did
you choose for each?" A green run does not mean the contract is complete — only that the
tests found nothing.
Points What it looks like
17–20 The agent's answer is in NOTES.md (pasted or summarised). For each point: the
section, the two readings, the one you chose and why, and the sentence you would
add to CONTRACT.md . At least one point is one the agent did not list — found by
you.

11–16 Every point from the agent has a decision and a proposed sentence; none found by

you.

4–10 The agent's list is pasted with no decision, or decisions with no proposed wording.
0–3 Missing, or "no ambiguities" accepted without checking.

6. AI-LOG.md — 10 points
Points What it looks like
9–10 The prompt you handed over and every fix prompt are logged. Fix prompts name
the test and the contract section, not test code. Changed and Rejected are real:
at least one thing the agent wrote that you did not keep, and why.
5–8 Prompts logged, but a fix prompt pastes test code, or Rejected is empty.
1–4 A summary with no prompts.
0 No AI-LOG.md .

How to submit
One zip file, named after your student ID and the total you give yourself:
<StudentID>_<total>.zip , for example 23127001_82.zip . Turn it in from your
<StudentID>@student.hcmus.edu.vn Google account.
The zip must contain SELF_ASSESSMENT_REPORT.md : one row per criterion in this rubric, the marks
you claim, and evidence pointing at a file, a commit, a test name or a section of NOTES.md —
plus a short what I did not manage. The total in that table is the number in the file name.
Template on Classroom.
A wrong file name costs no marks but delays your result — the grading script matches
submissions to the class list by that name.
Honesty adjustment
Your self-assessment is compared with the mark you actually earn. The gap is your total − the
mark , on the same 100-point scale.
Gap Adjustment
within ±10 none — this is normal calibration
+11 to +20 −3
+21 to +30 −6
more than +30 −10
−21 or worse −3 — read the rubric before you score yourself down
no SELF_ASSESSMENT_REPORT.md −10, and the file-name total is ignored
A criterion you claim with no evidence line counts as claimed-and-not-done for this comparison.
The adjustment never takes a submission below 0.