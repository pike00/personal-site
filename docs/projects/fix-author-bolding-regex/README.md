---
title: Replace brittle author-bolding regex
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: S
impact: low
next_step: Bold authors by structured identity instead of a name regex with a Morgan carve-out
source: ../../extensions-2026-05-29.md
---

# Replace brittle author-bolding regex

## Goal

Bold "Will Pike" in publication author lists using a robust rule, removing the hardcoded `!/\bMorgan\b/` carve-out that exists only to avoid mis-bolding a co-author named Morgan Pike.

## Why

`highlightAuthor` in `SearchPublications.tsx` tests `/\bPike\b/.test(a) && !/\bMorgan\b/.test(a)`. Any future co-author whose name contains "Pike" (or a second "Morgan") will be bolded or skipped incorrectly, silently. The match should key off a canonical author identity, not string pattern-matching against one name.

## Approach

- Define the canonical author form once (e.g. `"Pike WD"` / `"Pike W"` as used in the metadata) in a small constant or in `src/lib/types.ts`.
- Match author strings against that exact canonical token (or a small allowlist of accepted variants) rather than a `\bPike\b` substring.
- Apply the same logic anywhere author lists render (publication cards, detail page, citations).

## Tasks

- [ ] Audit `metadata.yml` author formats across `publications/Publications/*` to enumerate real variants of the self-author
- [ ] Add a `SELF_AUTHOR` canonical set and an `isSelf(author)` helper
- [ ] Replace the regex in `highlightAuthor`
- [ ] Drop the `Morgan` carve-out; confirm Morgan Pike (if present) is no longer special-cased

## Anchors

- `src/components/SearchPublications.tsx:16-21` — `highlightAuthor` regex
- `src/lib/publications.ts:80` — `authors: string[]` source
