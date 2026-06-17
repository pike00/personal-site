import { getPosts, getProjects, getPrints } from "./posts";
import { getPublications } from "./publications";

export type SearchDocType = "Note" | "Project" | "Publication" | "Print";

export interface SearchDoc {
  type: SearchDocType;
  title: string;
  description: string;
  url: string;
  tags: string[];
}

/**
 * One flat index over every searchable surface — publications, notes, projects,
 * and 3D prints — for the global ⌘K command palette. Order: publications first
 * (largest corpus), then notes, projects, and prints.
 *
 * This index powers the Fuse fallback ONLY. It is built and serialized into the
 * page exclusively when `flags.search === "fuse"`; when DocSearch owns search
 * (the current default) PageLayout passes `[]` and never calls this — see the
 * gate in src/layouts/PageLayout.astro. DocSearch covers prints automatically
 * by crawling the live /prints/* pages.
 */
export function buildGlobalIndex(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const pub of getPublications()) {
    const year = pub.pubDate ? pub.pubDate.split("-")[0] : "";
    docs.push({
      type: "Publication",
      title: pub.title,
      description: [pub.journal, year].filter(Boolean).join(", "),
      url: `/publications/${pub.slug}`,
      tags: pub.researchArea,
    });
  }

  for (const post of getPosts()) {
    docs.push({
      type: "Note",
      title: post.title,
      description: post.description,
      url: `/notes/${post.slug}`,
      tags: post.tags,
    });
  }

  for (const project of getProjects()) {
    docs.push({
      type: "Project",
      title: project.title,
      description: project.description,
      url: `/projects/${project.slug}`,
      tags: project.tags,
    });
  }

  for (const print of getPrints()) {
    docs.push({
      type: "Print",
      title: print.title,
      description: print.description,
      url: `/prints/${print.slug}`,
      tags: print.tags,
    });
  }

  return docs;
}
