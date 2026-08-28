export const prerender = true;

import { getPublications } from "../../lib/publications";
import { toRIS } from "../../lib/citations";

/** Combined RIS file with one record per publication. */
export function GET() {
  const body = getPublications().map(toRIS).join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "application/x-research-info-systems; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pike-publications.ris"',
    },
  });
}
