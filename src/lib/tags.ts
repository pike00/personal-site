import { getPublications } from "./publications";
import { getPosts, getProjects } from "./posts";
import type { Publication } from "./types";
import type { Post, ProjectEntry } from "./posts";

/**
 * URL-safe slug for a tag. Tags carry their own encoding (publications'
 * `slugify` drops leading digits, which is wrong for tags). Lowercase,
 * non-alphanumeric runs collapse to a single dash.
 */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface TopicData {
  /** Canonical display form (first occurrence wins on slug collisions). */
  tag: string;
  slug: string;
  publications: Publication[];
  posts: Post[];
  projects: ProjectEntry[];
}

/**
 * Build one topic per unique tag across publications (`researchArea`), blog
 * posts, and projects (`tags`). A topic is only created when a tag is seen on
 * an item, so every topic has at least one entry — no orphan/empty pages.
 * Sorted by display tag.
 */
export function getAllTopics(): TopicData[] {
  const map = new Map<string, TopicData>();
  const bucket = (tag: string): TopicData => {
    const slug = tagSlug(tag);
    let topic = map.get(slug);
    if (!topic) {
      topic = { tag, slug, publications: [], posts: [], projects: [] };
      map.set(slug, topic);
    }
    return topic;
  };

  for (const pub of getPublications())
    for (const tag of pub.researchArea) bucket(tag).publications.push(pub);
  for (const post of getPosts())
    for (const tag of post.tags) bucket(tag).posts.push(post);
  for (const project of getProjects())
    for (const tag of project.tags) bucket(tag).projects.push(project);

  return [...map.values()].sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Display forms of every tag in the corpus, sorted. */
export function getAllTags(): string[] {
  return getAllTopics().map((t) => t.tag);
}
