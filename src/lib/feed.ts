import { getPosts, getProjects, getPrints } from "./posts";
import { getPairedProjectSlug, getPairedPostSlug } from "./pairings";

export interface FeedEntry {
  type: "post" | "project" | "print";
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  draft?: boolean;
  hideFromFeed?: boolean;
  projectSlug?: string;
  postSlug?: string;
}

export interface FeedOptions {
  includeDrafts?: boolean;
  /**
   * If true, returns all items without hiding paired project duplicates or
   * items marked `hideFromFeed: true`.
   */
  showAll?: boolean;
}

/**
 * Get a unified, deduplicated feed of posts, projects, and 3D prints.
 *
 * Deduplication rules:
 * 1. Any item with `hideFromFeed: true` (or `hide_from_feed: true`) in frontmatter
 *    is excluded from mixed feeds (unless showAll: true).
 * 2. When a Project is paired with a Post, and that Post is active in the feed,
 *    the duplicate Project entry is hidden from mixed feeds (preferring the
 *    long-form Post entry).
 */
export function getCombinedFeed(opts: FeedOptions = {}): FeedEntry[] {
  const posts = getPosts({ includeDrafts: opts.includeDrafts });
  const projects = getProjects();
  const prints = getPrints();

  const feed: FeedEntry[] = [];
  const activePostSlugs = new Set<string>();

  // Add posts
  for (const post of posts) {
    if (!opts.showAll && post.hideFromFeed) continue;

    activePostSlugs.add(post.slug);
    feed.push({
      type: "post",
      slug: post.slug,
      title: post.title,
      description: post.description,
      date: post.date,
      tags: post.tags,
      draft: post.draft,
      hideFromFeed: post.hideFromFeed,
      projectSlug: getPairedProjectSlug(post.slug) ?? undefined,
    });
  }

  // Add projects
  for (const project of projects) {
    if (!opts.showAll && project.hideFromFeed) continue;

    const pairedPostSlug = getPairedPostSlug(project.slug);
    // Deduplicate: if paired with an active post present in the feed, skip duplicate project card
    if (!opts.showAll && pairedPostSlug && activePostSlugs.has(pairedPostSlug)) {
      continue;
    }

    feed.push({
      type: "project",
      slug: project.slug,
      title: project.title,
      description: project.description,
      date: project.date,
      tags: project.tags,
      hideFromFeed: project.hideFromFeed,
      postSlug: pairedPostSlug ?? undefined,
    });
  }

  // Add prints
  for (const print of prints) {
    if (!opts.showAll && print.hideFromFeed) continue;

    feed.push({
      type: "print",
      slug: print.slug,
      title: print.title,
      description: print.description,
      date: print.date,
      tags: print.tags,
      hideFromFeed: print.hideFromFeed,
    });
  }

  return feed.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}
