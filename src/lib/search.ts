import { getPosts, getProjects } from "./posts";
import { getPublications } from "./publications";

export type SearchDocType = "Note" | "Project" | "Publication";

export interface SearchDoc {
  type: SearchDocType;
  title: string;
  description: string;
  url: string;
  tags: string[];
}

/**
 * One flat index over every searchable surface — notes, projects, and
 * publications — for the global ⌘K command palette. Built once at build time
 * and serialized into the page for the client-side Fuse search. Order:
 * publications first (largest corpus), then notes, then projects.
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

  return docs;
}
