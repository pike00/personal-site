import rss from "@astrojs/rss";
import { getPosts, getProjects, getPrints } from "../lib/posts";

interface Item {
  title: string;
  description: string;
  pubDate: Date;
  link: string;
}

export async function GET() {
  const items: Item[] = [];

  // Blog posts
  for (const post of getPosts()) {
    items.push({
      title: post.title,
      description: post.description,
      pubDate: new Date(post.date),
      link: `/notes/${post.slug}/`,
    });
  }

  // Projects
  for (const project of getProjects()) {
    items.push({
      title: project.title,
      description: project.description,
      pubDate: new Date(project.date),
      link: `/projects/${project.slug}/`,
    });
  }

  // 3D prints
  for (const print of getPrints()) {
    items.push({
      title: print.title,
      description: print.description,
      pubDate: new Date(print.date),
      link: `/prints/${print.slug}/`,
    });
  }

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "Will Pike",
    description: "Writing and projects from Will Pike, MD",
    site: "https://pikemd.com",
    items,
  });
}
