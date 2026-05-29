/**
 * Canonical author identity for the site owner (Will Pike — formally
 * Conner William Pike), used to bold the self-author in publication author
 * lists.
 *
 * These are the exact forms that appear across `publications/Publications/*\/
 * metadata.yml`, which use `FirstInitialMiddleInitial Lastname` style
 * ("CW Pike"; "W Pike" where the metadata omits the middle name). Matching is
 * by canonical identity (case-insensitive, whitespace-collapsed exact match)
 * rather than a `\bPike\b` substring, so a co-author who merely shares the
 * surname (e.g. "M Pike", formerly "Morgan Pike") is never mis-bolded and no
 * per-name carve-out is needed. Add a new variant here if the metadata ever
 * spells the self-author a different way.
 */
export const SELF_AUTHOR = [
  "CW Pike",
  "W Pike",
] as const;

function canonical(author: string): string {
  return author.toLowerCase().replace(/\s+/g, " ").trim();
}

const SELF_AUTHOR_SET = new Set(SELF_AUTHOR.map(canonical));

/** True when `author` is the site owner under any known canonical form. */
export function isSelf(author: string): boolean {
  return SELF_AUTHOR_SET.has(canonical(author));
}

/**
 * Render an author list with the self-author wrapped in `<strong>`. Accepts
 * either a `string[]` (publication metadata shape) or a `", "`-joined string
 * (the search index shape) and returns an HTML string for injection via
 * `set:html` / `dangerouslySetInnerHTML`.
 */
export function highlightAuthors(authors: string | string[]): string {
  const list = Array.isArray(authors) ? authors : authors.split(", ");
  return list.map((a) => (isSelf(a) ? `<strong>${a}</strong>` : a)).join(", ");
}
