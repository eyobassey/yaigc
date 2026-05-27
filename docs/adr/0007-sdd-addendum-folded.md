# ADR 0007 — SDD Addendum (Three Patterns) folded into the SDD master

- **Status**: Accepted
- **Date**: 2026-05-27
- **Authors**: Bassey Eyo

## Context

In May 2026 a long phone conversation between Bassey and Yemi (a
trusted partner with lived experience of care work) produced three
operational patterns that were not in the original Solution Design
Document:

1. **Cover companion** — every Match has a named back-up who shadows
   the primary on roughly one visit in five during the first two
   months, then steps in when the primary cannot make a visit.
2. **Cultural-fit recruitment refinement** — the right companion is
   not just someone with the right experience, but someone with the
   right temperament, stability, and disposition. Operationalised as
   a Likert rubric the operator scores during interviews.
3. **Two-visit calibration window** — the first two visits of any
   new match are explicitly calibration visits. Within 72 hours of
   visit two the operator team conducts a structured review with
   both the family and the companion, deciding continue / adjust /
   reset.

These three patterns were written up as a standalone addendum (`docs/
Design_Memo_Shape_Of_The_Relationship.pdf` covered the relationship
work; the three patterns are in
`docs/SDD_Addendum_Three_Patterns.pdf`) on the understanding that
they would be transposed into the SDD master once two §6 triggers
had fired:

- The operator console matching surface was built (fold cover-companion
  fields into SDD §11.3 + §11.4)
- The companion interview rubric was built (fold cultural-fit refinement
  into SDD §10.6.3)

Both triggers fired in Stage S (cover-companion + two-visit
calibration) and Stage T (interview rubric + Phase 0 questionnaire)
and Stage U (matching surface — candidate filter + side-by-side
proposal + cover-introduction scheduling). The addendum has now been
fully built into the platform.

## Decision

The SDD Addendum is **folded into the SDD master** as of this ADR. Its
content is no longer a separate document; the relevant rules now live
(or will live, at the next SDD revision) in:

- **SDD §10.6.3 — Companion vetting criteria** — picks up addendum §3
  (cultural-fit refinement). The companion interview rubric scores
  candidates against five behavioural cultural-fit bands (UK
  settledness as soft preference, community-driven temperament,
  reads-a-room, scheduling stability, motivation beyond income) plus
  four harder vetting gates (DBS clearable, references positive,
  engagement-terms comfort, training acceptance).
- **SDD §11.3 — Matching** — picks up addendum §2.4 + §2.5
  (cover-companion fields on the Match entity, side-by-side proposal
  UX with cover named alongside primary).
- **SDD §11.4 — Visits** — picks up addendum §2.4 (cover-introduction
  visits with `Visit.secondaryCompanionId` + `coverSuggested` hint)
  and addendum §4 (two-visit calibration review fields on Match,
  72-hour scheduling rule, structured workflow + multi-channel
  recipient-voice capture).

## Deliberate deviation: cover companion is a nudge, not a gate

The addendum literally said `coverCompanionId` is *"Required at match
acceptance, not optional."* The build softens this:

- `Match.coverCompanionId` is **nullable** in the schema and in form
  validation.
- Match acceptance and visit scheduling proceed without a cover.
- The today-dashboard surfaces a "Cover assignments pending" card
  so cover-less accepted matches stay visible to operators.

The reason (captured in `memory/project_cover_companion_non_blocking.md`):
the cover pool will not always have an immediate match available, and
refusing to start visits because cover is not named would harm the
family. The platform-quality benefit of a named cover does not
outweigh the cost of delaying the primary relationship.

This deviation is intentional and should be preserved when the SDD
PDF is next revised — write the SDD's wording as "the cover companion
SHOULD be named at acceptance," not "MUST."

## Status of the open questions

The addendum left several open questions; the build resolved them as
follows:

- **§3.6 — Five-year UK residence: hard filter or soft preference?**
  Soft preference. See `/companions/join` copy ("we look for five or
  so years of residence, though we are open to fewer when the rest
  fits") and the `UkSettledness` rubric enum that grades the read
  rather than blocking it.
- **§3.6 — Failed cultural-fit pathway.** When a `decline`
  recommendation lands on a thin interview history (≤1 prior
  interview, or only one operator has interviewed), the rubric form
  surfaces a non-blocking soft warning: *"Cultural fit is a
  judgement call. Consider a second interview with a different
  operator before declining."*
- **§4.6 — Recipient voice in the two-visit review.** Captured via
  four channels (Stage V): companion-relayed perspective on every
  post-visit report, operator's notes from the 15-min companion
  debrief, operator's notes from the 15-min family debrief, and
  optional notes from a direct operator → recipient call. The review
  surface honestly lays out which channels reached the recipient
  this round, including "no direct call this round" when one did not
  happen.

## Consequences

- The `docs/SDD_Addendum_Three_Patterns.pdf` file stays in the
  repository as a historical artefact. New code refers to the SDD
  master, not the addendum.
- Code comments that previously cited "SDD Addendum §X" may be left
  as-is for archaeological clarity, or updated to cite the new SDD
  section number when the file is next edited for an unrelated
  reason. No bulk renaming is planned.
- The SDD master PDF itself is owned by Bassey and gets updated out-
  of-band. This ADR is the engineering record that the fold-in
  happened.
- The §6 timer in the addendum ("six months from the date on this
  addendum, regardless of whether either trigger has fired") becomes
  moot — both triggers fired well within six months.
