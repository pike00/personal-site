import fs from "node:fs";
import path from "node:path";
import { matter } from "./frontmatter";
import { z } from "astro:content";

const BLOG_DIR = path.resolve("blog-posts/posts");
const PROJECTS_DIR = path.resolve("src/content/projects");
const PRINTS_DIR = path.resolve("src/content/prints");

/**
 * Schema for blog post frontmatter. Validated at load time so a typo'd `date`
 * or a missing `description` fails the build loudly instead of rendering an
 * `Invalid Date` or shipping an empty OG card / meta description.
 */
export const postFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date in YYYY-MM-DD form"),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().optional(),
  project: z.string().optional(),
  projectSlug: z.string().optional(),
  hideFromFeed: z.boolean().optional(),
  hide_from_feed: z.boolean().optional(),
});

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

export interface Post extends PostFrontmatter {
  slug: string;
  hideFromFeed?: boolean;
  project?: string;
  /** Raw markdown body (frontmatter stripped). */
  content: string;
}

export interface ProjectFrontmatter {
  title: string;
  description: string;
  date: string;
  tags: string[];
  url?: string;
  repo?: string;
  post?: string;
  postSlug?: string;
  hideFromFeed?: boolean;
  hide_from_feed?: boolean;
}

export interface ProjectEntry extends ProjectFrontmatter {
  slug: string;
  hideFromFeed?: boolean;
  post?: string;
  /** Raw markdown body (frontmatter stripped). */
  content: string;
}

interface RawEntry {
  slug: string;
  data: Record<string, unknown>;
  content: string;
}

/**
 * Read every `*.md` file in `dir` in `readdirSync` order (unsorted, matching
 * the prior inline reads so output stays byte-stable). Returns `[]` when the
 * directory is absent (submodule not initialized).
 */
function readMarkdownDir(dir: string): RawEntry[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data, content } = matter(raw);
      return { slug, data, content };
    });
}

/**
 * Load blog posts from the `blog-posts/` submodule. Drafts are filtered out by
 * default (every call site wants published-only); pass `includeDrafts` to keep
 * them. Order is the raw directory order, unsorted — callers sort as needed.
 */
export function getPosts(opts: { includeDrafts?: boolean } = {}): Post[] {
  return readMarkdownDir(BLOG_DIR)
    .map(({ slug, data, content }): Post => {
      const parsed = postFrontmatterSchema.safeParse(data);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("\n");
        throw new Error(
          `Invalid blog frontmatter in blog-posts/posts/${slug}.md:\n${issues}`,
        );
      }
      const hideFromFeed = Boolean(parsed.data.hideFromFeed ?? parsed.data.hide_from_feed);
      const project = parsed.data.project || parsed.data.projectSlug;
      return { slug, ...parsed.data, hideFromFeed, project, content };
    })
    .filter((p) => opts.includeDrafts || !p.draft);
}

/** Words per minute used for the reading-time estimate. */
const WORDS_PER_MINUTE = 200;

/**
 * Estimate reading time in whole minutes from raw markdown. Code fences, inline
 * code, footnote definitions, and raw HTML tags are stripped first so they
 * don't skew the count (a code-heavy post shouldn't read as a novel). Always at
 * least 1 minute.
 */
export function readingTimeMinutes(markdown: string): number {
  const prose = markdown
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/^\[\^[^\]]+\]:.*$/gm, " ") // footnote definitions
    .replace(/<[^>]+>/g, " "); // raw HTML tags
  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/**
 * Load project pages from `src/content/projects/`. Projects have no draft
 * concept, so all are returned. Order is the raw directory order, unsorted.
 */
export function getProjects(): ProjectEntry[] {
  return readMarkdownDir(PROJECTS_DIR).map(
    ({ slug, data, content }): ProjectEntry => ({
      slug,
      title: data.title as string,
      description: data.description as string,
      date: data.date as string,
      tags: (data.tags as string[]) ?? [],
      url: data.url as string | undefined,
      repo: data.repo as string | undefined,
      post: (data.post || data.postSlug) as string | undefined,
      hideFromFeed: Boolean(data.hideFromFeed ?? data.hide_from_feed),
      content,
    }),
  );
}

export interface PrintEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  /** Hero image for the gallery card (path under /public). */
  image?: string;
  repo?: string;
  hideFromFeed?: boolean;
  /** Raw markdown body (frontmatter stripped). */
  content: string;
}

/**
 * Load 3D-print pages from `src/content/prints/`. No draft concept, so all are
 * returned. Order is the raw directory order, unsorted.
 */
export function getPrints(): PrintEntry[] {
  return readMarkdownDir(PRINTS_DIR).map(
    ({ slug, data, content }): PrintEntry => ({
      slug,
      title: data.title as string,
      description: data.description as string,
      date: data.date as string,
      tags: (data.tags as string[]) ?? [],
      image: data.image as string | undefined,
      repo: data.repo as string | undefined,
      hideFromFeed: Boolean(data.hideFromFeed ?? data.hide_from_feed),
      content,
    }),
  );
}
