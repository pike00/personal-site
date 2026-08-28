import { parse as parseYaml } from "yaml";

/**
 * Minimal YAML-frontmatter parser, a drop-in for the slice of gray-matter this
 * repo used (`{ data, content }` only). Backed by the maintained `yaml` package
 * instead of gray-matter's bundled js-yaml 3.x, which carried a merge-key DoS
 * (js-yaml <=4.1.1) and is EOL. Parses only this repo's own trusted post/project
 * frontmatter — no custom delimiters, excerpts, or engines needed.
 */

// Leading optional BOM, then a `---` fence, the YAML block, and the closing
// `---` (with the newline after it consumed so `content` starts at the body).
const FRONTMATTER = /^\uFEFF?---\r?\n(.*?)\r?\n---[ \t]*\r?\n?/s;

export function matter(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const match = raw.match(FRONTMATTER);
  if (!match) return { data: {}, content: raw };
  const parsed = parseYaml(match[1]) as Record<string, unknown> | null;
  return { data: parsed ?? {}, content: raw.slice(match[0].length) };
}
