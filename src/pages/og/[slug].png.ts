export const prerender = true;

import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getPosts, getProjects, getPrints } from "../../lib/posts";
import { getPublications } from "../../lib/publications";

interface Props {
  title: string;
  description: string;
  label: string;
}

function loadFont(filename: string): Buffer {
  return fs.readFileSync(path.resolve("src/content/cv/fonts", filename));
}

export async function getStaticPaths() {
  const paths: { params: { slug: string }; props: Props }[] = [];

  for (const post of getPosts()) {
    paths.push({
      params: { slug: `note-${post.slug}` },
      props: { title: post.title, description: post.description, label: "Note" },
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

  for (const print of getPrints()) {
    paths.push({
      params: { slug: `print-${print.slug}` },
      props: { title: print.title, description: print.description, label: "Print" },
    });
  }

  // Static cards for the home page and CV (fixed copy, no source content).
  paths.push({
    params: { slug: "home" },
    props: {
      title: "Will Pike, MD",
      description: "Physician and clinical AI informaticist at Suki AI. Clinical informatics, research, and software.",
      label: "pikemd.com",
    },
  });
  paths.push({
    params: { slug: "cv" },
    props: {
      title: "Will Pike, MD",
      description:
        "Clinical AI Informaticist at Suki AI. Research and software development.",
      label: "Curriculum Vitae",
    },
  });

  return paths;
}

export async function GET({ props }: { props: Props }) {
  const { title, description, label } = props;

  const font = loadFont("Geist-Regular.ttf");
  const boldFont = loadFont("Geist-Bold.ttf");

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "1200px",
          height: "630px",
          background: "#f5f2ec",
          display: "flex",
          flexDirection: "column",
          padding: "60px",
          fontFamily: "Geist",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                background: "#f4e6dc",
                color: "#763b28",
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
                color: "#292621",
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
                color: "#69655e",
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
                color: "#93482f",
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
        { name: "Geist", data: font, weight: 400, style: "normal" },
        { name: "Geist", data: boldFont, weight: 700, style: "normal" },
      ],
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  const png = resvg.render().asPng();

  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
}
