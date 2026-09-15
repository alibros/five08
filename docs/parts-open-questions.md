# Open questions on part dimensions

Dimensions that could not be read off a drawing without a genuine ambiguity.

Each entry is a question somebody can answer — usually by owning the part and
putting a caliper on it, or by knowing which variant is the one people buy. The
part stays **generic** in the library until it is answered, which is the honest
state: an untraced figure is a stated estimate, a wrongly traced one looks
checked.

Anything unambiguous should never appear here. A thread callout plus the
clearance table in `.claude/skills/add-part/SKILL.md` is an answer, not a
question.

## How to add an entry

```markdown
### Part name — `part-id`

**Question.** One sentence, answerable.

- **Reading A:** what it would mean, with the page and view it comes from.
- **Reading B:** the same.
- **Leaning:** which one and why.
- **Source:** the datasheet URL.
- **Cost of guessing:** what a builder gets if we pick wrong.
```

## How to answer one

Edit the part in `src/catalog.ts`, add the `source`, run `npm test`, and delete
the entry in the same commit. The commit message should say what settled it.

## Open

*Nothing yet — no tracing run has been done from a machine that can reach
datasheets. Entries will appear here as they come up.*

## Settled

*Answered questions move here with a one-line note, so the same ambiguity is not
investigated twice.*
