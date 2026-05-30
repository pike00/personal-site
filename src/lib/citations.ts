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
  const last = parts[parts.length - 1];
  // Two name conventions appear in the metadata:
  //   Vancouver "Family Initials"  e.g. "Pike CW", "Shepherd L"  -> family is first
  //   Western  "Given ... Family"  e.g. "Xichong Liu", "C William Pike" -> family is last
  // Distinguish by the trailing token: all-caps initials (1-4 letters) signal
  // Vancouver order; anything else is given-first.
  if (/^[A-Z]{1,4}$/.test(last)) {
    return {
      "family-names": parts[0],
      "given-names": parts.slice(1).join(" "),
    };
  }
  return {
    "family-names": last,
    "given-names": parts.slice(0, -1).join(" "),
  };
}

/** "Family, Given" for an author string, or just the token if single-part. */
function familyComma(authorStr: string): string {
  const { "family-names": family, "given-names": given } =
    parseAuthor(authorStr);
  return given ? `${family}, ${given}` : family;
}

function year(pub: Publication): string {
  return pub.pubDate ? pub.pubDate.split("-")[0] : "";
}

/**
 * Deterministic BibTeX citation key: `pike<year><firstTitleWord>`, lowercased
 * and alphanumeric only (e.g. `pike2022case`). Stable across builds for a given
 * publication.
 */
export function citationKey(pub: Publication): string {
  const y = year(pub) || "nd";
  const firstWord = (pub.title.match(/[A-Za-z0-9]+/g)?.[0] ?? "untitled").toLowerCase();
  return `pike${y}${firstWord}`;
}

/** Human-readable Vancouver-style reference string. */
export function formatCitation(pub: Publication): string {
  const y = year(pub);
  const authors = pub.authors.join(", ");
  const vip = [
    pub.volume,
    pub.issue ? `(${pub.issue})` : "",
    pub.pages ? `:${pub.pages}` : "",
  ].join("");
  const parts = [
    authors ? `${authors}.` : "",
    `${pub.title}.`,
    pub.journal ? `${pub.journal}.` : "",
    y ? `${y}${vip ? `;${vip}` : ""}.` : "",
    pub.doi ? `doi:${pub.doi}` : "",
  ].filter(Boolean);
  return parts.join(" ");
}

/** BibTeX `@article` entry for a single publication. */
export function toBibTeX(pub: Publication): string {
  const fields: [string, string][] = [
    ["title", `{${pub.title}}`],
    ["author", `{${pub.authors.map(familyComma).join(" and ")}}`],
  ];
  if (pub.journal) fields.push(["journal", `{${pub.journal}}`]);
  if (year(pub)) fields.push(["year", `{${year(pub)}}`]);
  if (pub.volume) fields.push(["volume", `{${pub.volume}}`]);
  if (pub.issue) fields.push(["number", `{${pub.issue}}`]);
  if (pub.pages) fields.push(["pages", `{${pub.pages}}`]);
  if (pub.doi) fields.push(["doi", `{${pub.doi}}`]);

  const body = fields.map(([k, v]) => `  ${k} = ${v},`).join("\n");
  return `@article{${citationKey(pub)},\n${body}\n}\n`;
}

/** RIS record for a single publication (RefMan / EndNote / Zotero import). */
export function toRIS(pub: Publication): string {
  const lines: string[] = ["TY  - JOUR"];
  for (const author of pub.authors) lines.push(`AU  - ${familyComma(author)}`);
  lines.push(`TI  - ${pub.title}`);
  if (pub.journal) lines.push(`JO  - ${pub.journal}`);
  if (year(pub)) lines.push(`PY  - ${year(pub)}`);
  if (pub.volume) lines.push(`VL  - ${pub.volume}`);
  if (pub.issue) lines.push(`IS  - ${pub.issue}`);
  if (pub.pages) {
    const [sp, ep] = pub.pages.split(/[-–]/);
    if (sp) lines.push(`SP  - ${sp.trim()}`);
    if (ep) lines.push(`EP  - ${ep.trim()}`);
  }
  if (pub.doi) lines.push(`DO  - ${pub.doi}`);
  lines.push("ER  - ");
  return lines.join("\n") + "\n";
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
