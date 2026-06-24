export const prerender = true;

import { getPublications } from "../../lib/publications";
import { toBibTeX } from "../../lib/citations";

/** Combined BibTeX file with one @article entry per publication. */
export function GET() {
  const body = getPublications().map(toBibTeX).join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pike-publications.bib"',
    },
  });
}
