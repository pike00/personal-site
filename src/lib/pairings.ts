// Cross-links between project pages and blog posts.
//
// Each entry is a (projectSlug, postSlug) pair. The detail pages on
// /projects/[slug] and /blog/[slug] look up these pairings and render a
// callout linking to the other surface. If a paired post is a draft, the
// callout silently falls back to nothing.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

interface Pairing {
  projectSlug: string;
  postSlug: string;
}

const pairings: Pairing[] = [
  {
    projectSlug: "yolo-datestamp-detector",
    postSlug: "teaching-a-neural-net-to-find-date-stamps",
  },
];

const projectToPostMap = new Map(pairings.map((p) => [p.projectSlug, p.postSlug]));
const postToProjectMap = new Map(pairings.map((p) => [p.postSlug, p.projectSlug]));

function readFrontmatter(file: string): Record<string, unknown> | null {
  if (!fs.existsSync(file)) return null;
  return matter(fs.readFileSync(file, "utf-8")).data;
}

export interface PairedPost {
  slug: string;
  title: string;
  description: string;
}

export interface PairedProject {
  slug: string;
  title: string;
  description: string;
}

export function getPairedPost(projectSlug: string): PairedPost | null {
  const postSlug = projectToPostMap.get(projectSlug);
  if (!postSlug) return null;
  const data = readFrontmatter(path.resolve(`blog-posts/posts/${postSlug}.md`));
  if (!data || data.draft) return null;
  return {
    slug: postSlug,
    title: String(data.title),
    description: String(data.description),
  };
}

export function getPairedProject(postSlug: string): PairedProject | null {
  const projectSlug = postToProjectMap.get(postSlug);
  if (!projectSlug) return null;
  const data = readFrontmatter(path.resolve(`src/content/projects/${projectSlug}.md`));
  if (!data) return null;
  return {
    slug: projectSlug,
    title: String(data.title),
    description: String(data.description),
  };
}
