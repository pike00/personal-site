export const prerender = true;

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

interface Props {
  title: string;
  description: string;
  label: string;
}

function loadFont(filename: string): Buffer {
  return fs.readFileSync(
    path.resolve("node_modules/@fontsource/inter/files", filename)
  );
}

export async function getStaticPaths() {
  const paths: { params: { slug: string }; props: Props }[] = [];

  const blogDir = path.resolve("blog-posts/posts");
  if (fs.existsSync(blogDir)) {
    for (const file of fs.readdirSync(blogDir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(blogDir, file), "utf-8");
      const { data } = matter(raw);
      if (data.draft) continue;
      const slug = file.replace(/\.md$/, "");
      paths.push({
        params: { slug: `blog-${slug}` },
        props: { title: data.title, description: data.description, label: "Blog" },
      });
    }
  }

  const projectsDir = path.resolve("src/content/projects");
  if (fs.existsSync(projectsDir)) {
    for (const file of fs.readdirSync(projectsDir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(projectsDir, file), "utf-8");
      const { data } = matter(raw);
      const slug = file.replace(/\.md$/, "");
      paths.push({
        params: { slug: `project-${slug}` },
        props: { title: data.title, description: data.description, label: "Project" },
      });
    }
  }

  return paths;
}

export async function GET({ props }: { props: Props }) {
  const { title, description, label } = props;

  const font = loadFont("inter-latin-400-normal.woff");
  const boldFont = loadFont("inter-latin-700-normal.woff");

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "1200px",
          height: "630px",
          background: "#0f1729",
          display: "flex",
          flexDirection: "column",
          padding: "60px",
          fontFamily: "Inter",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                background: "#1e3a5f",
                color: "#60a5fa",
                fontSize: "18px",
                fontWeight: "700",
                padding: "8px 18px",
                borderRadius: "6px",
                display: "flex",
                marginBottom: "40px",
              },
              children: label,
            },
          },
          {
            type: "div",
            props: {
              style: {
                color: "#f1f5f9",
                fontSize: "64px",
                fontWeight: "700",
                lineHeight: "1.15",
                letterSpacing: "-1px",
                flex: "1",
                display: "flex",
                alignItems: "flex-start",
              },
              children: title.length > 60 ? title.slice(0, 57) + "..." : title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                color: "#94a3b8",
                fontSize: "28px",
                lineHeight: "1.4",
                marginBottom: "40px",
              },
              children:
                description.length > 100
                  ? description.slice(0, 97) + "..."
                  : description,
            },
          },
          {
            type: "div",
            props: {
              style: {
                color: "#60a5fa",
                fontSize: "22px",
                fontWeight: "700",
              },
              children: "pikemd.com",
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: font, weight: 400, style: "normal" },
        { name: "Inter", data: boldFont, weight: 700, style: "normal" },
      ],
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  const png = resvg.render().asPng();

  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
}
