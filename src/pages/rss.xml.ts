import rss from "@astrojs/rss";
import { getCombinedFeed } from "../lib/feed";

interface Item {
  title: string;
  description: string;
  pubDate: Date;
  link: string;
}

export async function GET() {
  const feed = getCombinedFeed();
  const items: Item[] = feed.map((entry) => {
    const route =
      entry.type === "post"
        ? "notes"
        : entry.type === "print"
          ? "prints"
          : "projects";
    return {
      title: entry.title,
      description: entry.description,
      pubDate: new Date(entry.date + "T00:00:00"),
      link: `/${route}/${entry.slug}/`,
    };
  });

  return rss({
    title: "Will Pike",
    description: "Writing and projects from Will Pike, MD",
    site: "https://pikemd.com",
    items,
  });
}
