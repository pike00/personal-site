import { defineCollection, z } from "astro:content";

const cv = defineCollection({
  type: "content",
  schema: z.object({
    name: z.string(),
    title: z.string(),
  }),
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().optional(),
    repo: z.string().optional(),
    tags: z.array(z.string()),
    date: z.string(),
  }),
});

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().optional(),
  }),
});

export const collections = { cv, projects, blog };
