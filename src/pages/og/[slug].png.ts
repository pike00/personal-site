export const prerender = true;

import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getPosts, getProjects } from "../../lib/posts";
import { getPublications } from "../../lib/publications";

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

  for (const post of getPosts()) {
    paths.push({
      params: { slug: `blog-${post.slug}` },
      props: { title: post.title, description: post.description, label: "Blog" },
    });
  }

  for (const project of getProjects()) {
    paths.push({
      params: { slug: `project-${project.slug}` },
      props: { title: project.title, description: project.description, label: "Project" },
    });
  }

  for (const pub of getPublications()) {
    const year = pub.pubDate ? pub.pubDate.split("-")[0] : "";
    const description = [pub.journal, year].filter(Boolean).join(", ");
    paths.push({
      params: { slug: `pub-${pub.slug}` },
      props: { title: pub.title, description, label: "Publication" },
    });
  }

  // Static cards for the home page and CV (fixed copy, no source content).
  paths.push({
    params: { slug: "home" },
    props: {
      title: "Will Pike, MD",
      description: "Physician and researcher. Publications, CV, and projects.",
      label: "pikemd.com",
    },
  });
  paths.push({
    params: { slug: "cv" },
    props: {
      title: "Will Pike, MD",
      description:
        "Curriculum vitae — physician-clinical informatician specializing in real-world evidence.",
      label: "Curriculum Vitae",
    },
  });

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
