---
name: deep-interview
description: Interview the user until their request is pinned down, and leave a locked intent record on disk that the next session can stand on. Offer it when a request is ambiguous, when it reads two or more ways, or when you cannot yet write down what would count as done — do not start it on your own. The user starts it with /fabricate:deep-interview.
argument-hint: "\"<what you want, in your own words>\""
---

# Deep interview

Whatever the user typed after this command is the **original request**. It is already sitting on
disk, byte for byte. You do not have to store it again, and **you do not get to summarize it away.**

The goal is that when the conversation ends, all of this is true:

- The sentences the user actually wrote are still there
- "What has to be true for this to be done" is written down in the user's own words
- The next session can stand on the same meaning without replaying this conversation

## This interview does not switch itself on — you offer it, the user decides

One interview costs a measured amount: nine reviewer subagent calls, roughly a hundred thousand
tokens, and **twenty round trips of the user's time.** The expensive part is not the tokens.

So **an agent never starts this skill on its own.** When a request is ambiguous, reads two or more
ways, or you cannot yet write down what would count as done — **say so, say why, and offer.**

> This request splits into (a) and (b). What gets built depends on which one you mean.
> Want to pin it down with `/fabricate:deep-interview "<request>"`, or should I assume (a) and go?

**The user decides.** If they say no, state your assumption out loud and carry on.
The rest of this document applies **after the user has switched it on.**

## The machine cannot see the conversation — only what is in the ledger

`fabricate` is a state keeper. It does not talk. **Whatever was said only exists if it was written down.**
If it was not, `close` refuses and no locked record gets made.

When a command refuses, **stderr carries the reason.** Read it, fix it, call again. Do not push past it.

---

## First turn — do all of this before the first question goes out

```sh
fabricate deep-interview start
```

**① Cut the user's words into fragments.** One per part of the request that needs its own handling.

```sh
fabricate turn record --kind fragment --id f1 --text "<a slice cut straight out of the original>"
```

`--text` **has to be a substring of the original.** Cut and paste it without changing a character —
polish it and it gets refused. Each fragment is later the unit for "nobody ever asked about this".

If it gets refused, look at the original again and cut more precisely. If it still fails, **leave that
fragment out** — in ③ `--covers` takes only fragment ids that actually made it into the ledger.
Naming an id that does not exist gets the whole question refused.

**② Set up the dimensions worth asking about.** A dimension is one fork you cannot walk past until
it has an answer.

```sh
fabricate turn record --kind dimension --id d1 --text "<what this fork is>"
```

If a dimension takes an earlier dimension's answer as its premise, write that chain down. When the
premise gets overturned, this one reopens.

```sh
fabricate turn record --kind dimension --id d2 --text "…" --depends-on d1
```

**③ Write the question, and have someone else read it before it goes out.**

You know the narrative of this conversation. That is exactly why **you cannot judge whether your own
question can be answered without it** — you fill the missing context in your head as you read. This is
the one place where grading yourself is structurally impossible, so this hand-off is **not optional.**

Use the host's Agent tool to launch the **`question-blind-reviewer`** subagent and hand it
**the question wording and nothing else.** No transcript, no earlier answers, no statement of what the
interview is for — the moment you hand any of that over, that reviewer becomes a second driver and the
verdict turns back into self-grading.
(If you cannot reach that agent, give a fresh subagent carrying no conversation context the
instructions in `agents/question-blind-reviewer.md` verbatim and take the same shape back.)

Write down the verdict you get. **Write it before the question.**

```sh
fabricate turn record --kind review --question q1 --text "<the exact wording that was reviewed>" \
  --verdict pass --reviewer question-blind-reviewer --reason "<the reason that came back, verbatim>"
```

If `reject` comes back, **that question does not go to the user.** Read the reason, rewrite, review again.
Recording another `review` under the same `--question` id makes the last verdict the live one.

Once it passes, record the question and send it.

```sh
fabricate turn record --kind question --id q1 --text "<the wording that was reviewed>" \
  --dimension d1 --covers f1,f2 \
  --recommend "<the answer you would give>" --because "<what that recommendation rests on>"
```

- `--text` **must not differ from the reviewed wording by a single character.** Reviewing one thing
  and sending another means the review did nothing.
- `--dimension` is **required.** A question you cannot tie to a dimension is a question that does not
  reach the goal, and it has no business being asked. `--covers` is the fragments this question handles.
- `--recommend` and `--because` are **required too.** You never ask empty-handed.

### Never ask empty-handed — bring a recommendation and what it rests on

Every question carries **the answer you would give and what that recommendation stands on.** What it
stands on has to be something the user can go check: files and line numbers you read, output from a
command you ran, an earlier answer. *"It seems better"* is not a reason.

Put both in the question wording itself — `--recommend` and `--because` are the ledger's copy, but what
the user reads is the sentence you send.

> I read this as **(a)** — `src/hooks.ts:129` decides purely on whether the file exists.
> Shall we go with that, or do you see it differently?

### Test the question's premise against the code — before sending it

Writing a recommendation means reading the code, and reading it sometimes shows that
**the question itself stands on a false premise**. *"Should we build a retry?"* assumes there is none
when the code already has one. A reviewer who cannot see the conversation cannot catch that — what they
measure is the wording, not the facts.

When a premise clashes with the code, **do not send that question.** Write the clash down.

```sh
fabricate turn record --kind challenge --id ch1 --question q1 \
  --citation "<file>:<line>" --text "<what the question assumes, and what the code actually is>"
```

`--citation` has to be **a file and line that exist.** A path that is not there gets refused.
Use the same record when a user's answer clashes with the code, and add `--answer a1` in that case.

Once it is written down, **rewrite the question to match the facts.** Usually *"should we build"*
becomes *"it already works like this — leave it or change it?"*. The rewritten wording goes back for review.

**A question you could answer yourself by reading the code still gets asked.** Being able to answer it
does not mean it need not be asked — it means **you can bring a recommendation with grounds.** The
places you skip are the places where an agent changes the meaning without the user knowing. When you
know the answer, the cost of asking drops to the user saying "yes"; the question does not disappear.

---

## Show the standing at the end of every turn — before the user asks

Every time `fabricate turn record` succeeds it prints **a status block covering only what changed this
turn**: one summary line on top, and of the three sections only the ones that actually moved.

```
─ so far: settled 5 · open 2 · full view `fabricate deep-interview status` ─
settled this turn
  …
opened this turn
  (none)
reading updated this turn
  (none)
─
```

The three sections are still settled · still open · **how the request is currently being read** — they
are just not re-listed every turn, only what newly changed. To see everything including what did not
change, run `fabricate deep-interview status` — it prints the whole thing accumulated so far.

**Before you end the turn, put the block from that turn's last record above your own prose.**
The question has to end up at the very bottom of the response so it is visible without scrolling. This
is not something the user asks for — it happens every time. If the user has to ask "where are we", then
they also have to ask before they can find out where you bent their meaning.

The block reads **only what is in the ledger.** Whatever is only in your head is not in there. If the
`reading updated this turn` section is empty, you have not written down how you are reading things.

## The turns that follow

**When an answer comes in**, record it verbatim. Do not polish it. Do not shorten it.

```sh
fabricate turn record --kind answer --id a1 --question q1 --text "<the user's sentence, exactly>"
```

- If the answer amounts to "I'm not sure", add `--unsure`. Do not hide it — readiness counts those.
- If the answer **overturns an earlier dimension's premise**, add `--overturns d1`. Then `d1` and
  everything that leaned on `d1` come back into the interview. That is the correct behaviour.

**Anything the user brings up unprompted goes in its own record.** A rebuttal, a change of direction,
a question back at you ("why do we even need that") — there is no question to bind it to, so it cannot
go in as an `answer`.

```sh
fabricate turn record --kind remark --id m1 --text "<the user's sentence, exactly>"
```

- **Record it before you respond.** Record it later and it has already turned into your words.
- If it **overturns something already settled**, add `--overturns d1`. Then `d1` and everything leaning
  on it reopen. If the user changed direction and the ledger did not, the ledger is wrong.
- **Do not replace what you wrote here with your own summary of it.** If you need a summary, write the
  summary somewhere else and leave the original as the original.

**Say it back in different words.** One per answer.

```sh
fabricate turn record --kind restate --id r1 --answer a1 --text "<the same thing in other words + a concrete case>"
```

Handing the user's own phrasing back gets **refused.** A parrot is not a check.
Attach a case: "So for instance, if <concrete situation>, then <this> happens — is that the idea?"

**Do not stop here waiting for a "yes".** Send the restatement **in the same response as the next
question** and move on. Extracting a confirmation per answer spends the user's turns on confirming
instead of on content — in real use that was eleven round trips, every one of them for a single "yes".

The machine does not block progress either. The one place that checks confirmation is `close`.

When the user says "no, that's not it", that is the most valuable moment there is. **Write it down
immediately, no deferring.**

```sh
fabricate turn record --kind confirm --restate r1 --verdict rejected
```

Then fix it and say it back again. **Acceptance is collected in one pass before closing** (see ① below).

**When you close a dimension**, bring both the grounds and which answer closed it.

```sh
fabricate turn record --kind resolve --dimension d1 --evidence "<what closes it>" --answer a1
```

**Without both, the dimension does not close** — it stands as an attempt to close without grounds.
Declaring "this one's handled" does not close anything.

---

## Before closing — four things, all required

**① Get everything you read back confirmed in one pass.**

All through the interview you have been restating without collecting acceptance. Collect it here.
Show the latest line for every answer in a single response and ask — *"here is how I read all of this.
Anything wrong?"*

`fabricate deep-interview status` lists them for you: the `current reading` section carries one line
per answer, and each line holds the restate id you need below.

Record only what the user objects to as `rejected`, fix those and restate them. Record the rest as `accepted`.

```sh
fabricate turn record --kind confirm --restate r1 --verdict accepted
```

Only **the latest restatement of an answer** can be confirmed. Naming a superseded one gets refused and
the refusal names the one that replaced it — accepting a reading the user already pushed back on is not
something you can do by mistyping an id.

If a single unconfirmed answer is left, `close` refuses and prints every one of their ids.
**Skip this one pass and a reading the user never saw gets locked in** — this is the last place the
interview catches a misreading.

**② Write down the completion criteria. `close` refuses if there is not one.**

If the goal predicate is *"what has to be true for this to be done"*, a criterion is *"who decides
whether it is, and how"*. They are different, and you need both.

```sh
fabricate turn record --kind criterion --id k1 --text "<what gets judged>" --type hard
```

- `hard` is **what a machine can settle**, `soft` is **what a person has to look at.**
  Do not invent a fake rule for a `soft` one — leave it as a human call.
- A `hard` one needs **at least one case the user judged themselves**, and the rule comes out of that
  case. You do not take an abstract definition first.

```sh
fabricate turn record --kind example --id e1 --criterion k1 \
  --text "<a concrete case>" --verdict "<what the user called it>"
fabricate turn record --kind rule --criterion k1 --text "<the rule drawn from those cases>"
```

Writing a `rule` with no `example` gets refused. Reverse the order and agreement drifts apart from
verification.

**③ The cross-answer contradiction pass.** It runs after the last answer comes in. Sweep every pair of
answers for anything that does not line up.

```sh
fabricate turn record --kind contradiction-pass --text "<what you compared against what>"
```

Write down each contradiction you find, ask the user, then write down how it resolved.

```sh
fabricate turn record --kind contradiction --id c1 --text "<what clashes with what>" --between a1,a3
fabricate turn record --kind contradiction-resolved --contradiction c1 --text "<how it resolved>"
```

**You cannot finish without running it at least once.** If it never ran, that is what gets recorded —
there is no pretending it did.

**④ Show the user the goal predicate wording, then record exactly that — and name the remarks it carries.**

Before you write it, go back through **every `remark`** and ask, one at a time: is this in the wording?
The predicate is your prose, not the user's, and this is the step where the user's own decisions go
missing. In real use the predicate got rewritten four times and every rewrite was the user putting back
something they had already said.

```sh
fabricate turn record --kind goal --text "<what has to be true for this to be done — the wording you showed the user>" \
  --covers m1,m4,m7
```

`--covers` is the remarks this wording actually carries. A remark that does **not** belong in the
predicate — the user renaming something, or asking why you asked at all — gets set aside instead, with
the reason it is not a completion condition.

```sh
fabricate turn record --kind set-aside --remark m16 --reason "<why this is not goal content>"
```

A remark that is neither carried nor set aside makes `close` refuse, and it prints those ids. Silence is
the failure this step exists to catch, so "I did not mention it" is not one of the outcomes.

The output carries `goal-hash: <hash>`. **Take that value straight to close.**

```sh
fabricate deep-interview close --goal-hash <the hash you just got>
```

If what you showed and what gets stored differ, the hash will not match and it gets refused. If you
changed the wording, record `goal` again and take the new hash.

When `close` passes it prints the record's path. Tell the user that path.
When it refuses, **it prints everything that is still outstanding.** Show the user that, and go ask
about what is left.

---

## How to ask

**One at a time.** Send three questions in a bundle and the user answers one, while the other two slide
past as if they had been answered.

- **Ask "why" repeatedly.** Walk down from the surface request to the judgement behind it. Two or three
  rounds of "why does that matter" usually reaches the real construct. Do not do it like an
  interrogation — build each question on the answer before it.
- **Offer three alternatives to choose from.** Better than a blank question ("how would you like it?"):
  show three concretely different options and ask which is closest and which is definitely not it.
- **Ask for the opposite pole.** "What would count as failure" draws the boundary as sharply as
  "what would count as success".
- **Pre-mortem.** "Suppose this all gets built and six months later it failed — what would have caused it?"
- **Build criteria out of cases.** Where a criterion is needed, do not take an abstract definition —
  take **at least one case the user judged themselves** and derive the criterion from it. That is the
  only way agreement and verification do not drift apart.

## What not to do

- **Never store a summary in place of the user's words.** A summary displacing the original is the
  exact failure this thing exists to prevent.
- **Do not lead the answer.** "So you want X, right?" is a proposal, not a question.
- **Do not end on your own "I understand it all now".** If you decide when it ends, your own conviction
  never gets broken by anything. When you judge that nothing is left, say so and call `close` — the
  machine makes that call.
- **When an answer clashes with the current code, do not just write it down.** Cite the file and line
  and ask again. The code is the authority.
- **Do not ask about every ambiguity.** If a reading splits but the output does not change, assume and
  **write the assumption down where it can be seen.** Only what changes the output or is hard to
  reverse becomes a question.

## The words you write to the user

**Write in the language the user wrote in.** This document, the CLI's output, and the agent definitions
are all in English because the reader there is you, not them. What the user reads is what you write, and
that follows them.

- When you relay the status block or a refusal reason, **put it in the user's language.** Do not paste
  the English through.
- **A sentence quoting the user stays exactly as they wrote it.** Their words are not yours to translate.
- Use the user's own words for things. **Do not import a term the user never used.** If you truly need
  one, unpack it in a line the first time it appears.
