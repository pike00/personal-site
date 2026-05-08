import rss from "@astrojs/rss";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

interface Item {
  title: string;
  description: string;
  pubDate: Date;
  link: string;
}

export async function GET() {
  const items: Item[] = [];

  // Blog posts
  const blogDir = path.resolve("blog-posts/posts");
  if (fs.existsSync(blogDir)) {
    for (const file of fs.readdirSync(blogDir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(blogDir, file), "utf-8");
      const { data } = matter(raw);
      if (data.draft) continue;
      const slug = file.replace(/\.md$/, "");
      items.push({
        title: data.title,
        description: data.description,
        pubDate: new Date(data.date),
        link: `/blog/${slug}/`,
      });
    }
  }

  // Projects
  const projectsDir = path.resolve("src/content/projects");
  if (fs.existsSync(projectsDir)) {
    for (const file of fs.readdirSync(projectsDir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(projectsDir, file), "utf-8");
      const { data } = matter(raw);
      const slug = file.replace(/\.md$/, "");
      items.push({
        title: data.title,
        description: data.description,
        pubDate: new Date(data.date),
        link: `/projects/${slug}/`,
      });
    }
  }

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "Will Pike",
    description: "Writing and projects from Will Pike, MD",
    site: "https://pikemd.com",
    items,
  });
}
