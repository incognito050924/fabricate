---
name: seed
description: Read the locked intent record an earlier interview left behind and start work on that meaning without replaying the conversation. Use it when a new session or a different agent picks up "the thing we settled last time".
argument-hint: "<intent id>"
---

# Start from the locked intent

The string after this command is **the id of a locked intent record**.

You did not run that interview and you cannot see that conversation. **You can still stand on the same
meaning** — that is what the record exists for. Do not try to reconstruct the conversation. Read the record.

## First step — before anything else

```sh
fabricate deep-interview show <id>
```

Two things come out of it.

- **The sentences the user actually wrote.** Not a summary — the original bytes.
- **The goal predicate** — "what has to be true for this to be done", in the user's own words.

If the command fails, either there is no record under that id or it is not locked yet. **Do not fill the
gap with a guess.** Check the id with the user, or tell them the interview has not finished.

## Then — what to do and what not to

- **Do not put the original into your own words.** Preventing exactly that is why the record exists.
  Quote the original when you talk to the user about it too.
- **Use the goal predicate as the definition of done.** You do not get to set a new one. Nothing gets
  added "while we're here" that is not in the predicate.
- **Say you do not know when the record does not say.** If something the interview never covered comes
  up, ask the user instead of assuming on the spot. If there is a lot to ask, open
  `/fabricate:deep-interview` again.
- **Ask the machine before claiming it is done.**

  ```sh
  fabricate check <id>
  ```

  Every goal predicate needs evidence that it is satisfied. Evidence is made like this:

  ```sh
  fabricate check record --intent <id> --goal <n> --command "<a command that confirms this goal is met>"
  ```

  `<n>` is the goal predicate's position, counting from 0. If `fabricate check <id>` does not exit 0,
  **it is not done.** The output says what is missing and why.

## The words you write to the user

Write in the language the user wrote in. This document and the CLI's output are in English because the
reader there is you. **A sentence quoting the user stays exactly as they wrote it.**
