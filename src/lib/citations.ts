import type { Publication } from "./types";

interface CffAuthor {
  "family-names": string;
  "given-names": string;
}

function parseAuthor(authorStr: string): CffAuthor {
  const parts = authorStr.trim().split(/\s+/);
  if (parts.length === 1) {
    return { "family-names": parts[0], "given-names": "" };
  }
  return {
    "family-names": parts[0],
    "given-names": parts.slice(1).join(" "),
  };
}

export function generateCitationCff(publications: Publication[]): string {
  const lines: string[] = [
    "cff-version: 1.2.0",
    'title: "Will Pike - Publications"',
    "type: dataset",
    "authors:",
    "  - family-names: Pike",
    "    given-names: CW",
    "references:",
  ];

  for (const pub of publications) {
    if (!pub.id) continue;

    lines.push("  - type: article");
    lines.push(`    title: "${pub.title.replace(/"/g, '\\"')}"`);
    lines.push("    authors:");

    for (const author of pub.authors) {
      const parsed = parseAuthor(author);
      lines.push(`      - family-names: "${parsed["family-names"]}"`);
      lines.push(`        given-names: "${parsed["given-names"]}"`);
    }

    if (pub.doi) {
      lines.push(`    doi: "${pub.doi}"`);
    }
    if (pub.journal) {
      lines.push(`    journal: "${pub.journal.replace(/"/g, '\\"')}"`);
    }

    const yearMatch = pub.pubDate.match(/(\d{4})/);
    if (yearMatch) {
      lines.push(`    year: ${yearMatch[1]}`);
    }
  }

  return lines.join("\n") + "\n";
}
