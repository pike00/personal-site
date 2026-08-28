// Cross-links between project pages and blog posts.
//
// Each entry is a (projectSlug, postSlug) pair. The detail pages on
// /projects/[slug] and /notes/[slug] look up these pairings and render a
// callout linking to the other surface. If a paired post is a draft, the
// callout silently falls back to nothing.
//
// Pairings can be declared statically in `staticPairings` or dynamically via
// frontmatter (`project: "coldkey"` in a post, or `post: "coldkey-post"` in a project).

import fs from "node:fs";
import path from "node:path";
import { matter } from "./frontmatter";

export interface Pairing {
  projectSlug: string;
  postSlug: string;
}

const staticPairings: Pairing[] = [
  {
    projectSlug: "yolo-datestamp-detector",
    postSlug: "teaching-a-neural-net-to-find-date-stamps",
  },
  {
    projectSlug: "coldkey",
    postSlug: "coldkey-paper-backup-age-keys",
  },
];

function readFrontmatter(file: string): Record<string, unknown> | null {
  if (!fs.existsSync(file)) return null;
  return matter(fs.readFileSync(file, "utf-8")).data;
}

let projectToPostMap: Map<string, string> | null = null;
let postToProjectMap: Map<string, string> | null = null;

function ensurePairingMaps() {
  if (projectToPostMap && postToProjectMap) return;

  const projToPost = new Map<string, string>();
  const postToProj = new Map<string, string>();

  // 1. Add static pairings
  for (const p of staticPairings) {
    projToPost.set(p.projectSlug, p.postSlug);
    postToProj.set(p.postSlug, p.projectSlug);
  }

  // 2. Scan blog-posts/posts/*.md for `project` or `projectSlug`
  const blogDir = path.resolve("blog-posts/posts");
  if (fs.existsSync(blogDir)) {
    for (const file of fs.readdirSync(blogDir)) {
      if (!file.endsWith(".md")) continue;
      const postSlug = file.replace(/\.md$/, "");
      const data = readFrontmatter(path.join(blogDir, file));
      if (!data) continue;
      const projectSlug = (data.project || data.projectSlug) as string | undefined;
      if (projectSlug) {
        projToPost.set(projectSlug, postSlug);
        postToProj.set(postSlug, projectSlug);
      }
    }
  }

  // 3. Scan src/content/projects/*.md for `post` or `postSlug`
  const projectsDir = path.resolve("src/content/projects");
  if (fs.existsSync(projectsDir)) {
    for (const file of fs.readdirSync(projectsDir)) {
      if (!file.endsWith(".md")) continue;
      const projectSlug = file.replace(/\.md$/, "");
      const data = readFrontmatter(path.join(projectsDir, file));
      if (!data) continue;
      const postSlug = (data.post || data.postSlug) as string | undefined;
      if (postSlug) {
        projToPost.set(projectSlug, postSlug);
        postToProj.set(postSlug, projectSlug);
      }
    }
  }

  // 4. Automatic heuristic fallback: match unpaired projects with posts whose slug matches or starts with `<projectSlug>-`
  const allProjectSlugs: string[] = fs.existsSync(projectsDir)
    ? fs.readdirSync(projectsDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
    : [];

  const allPostSlugs: string[] = fs.existsSync(blogDir)
    ? fs.readdirSync(blogDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
    : [];

  for (const projectSlug of allProjectSlugs) {
    if (projToPost.has(projectSlug)) continue;

    const match = allPostSlugs.find(
      (postSlug) => postSlug === projectSlug || postSlug.startsWith(`${projectSlug}-`),
    );

    if (match && !postToProj.has(match)) {
      projToPost.set(projectSlug, match);
      postToProj.set(match, projectSlug);
    }
  }

  projectToPostMap = projToPost;
  postToProjectMap = postToProj;
}

export function getPairedPostSlug(projectSlug: string): string | null {
  ensurePairingMaps();
  return projectToPostMap!.get(projectSlug) ?? null;
}

export function getPairedProjectSlug(postSlug: string): string | null {
  ensurePairingMaps();
  return postToProjectMap!.get(postSlug) ?? null;
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
  const postSlug = getPairedPostSlug(projectSlug);
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
  const projectSlug = getPairedProjectSlug(postSlug);
  if (!projectSlug) return null;
  const data = readFrontmatter(path.resolve(`src/content/projects/${projectSlug}.md`));
  if (!data) return null;
  return {
    slug: projectSlug,
    title: String(data.title),
    description: String(data.description),
  };
}
