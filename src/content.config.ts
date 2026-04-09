import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

const portfolio = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/portfolio" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    year: z.number(),
    role: z.string(),
    status: z.enum(["shipping", "active", "archived"]),
    stack: z.array(z.string()).default([]),
    featured: z.boolean().optional().default(false),
    order: z.number().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    publishedAt: z.coerce.date(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().optional().default(false),
    order: z.number().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { docs, portfolio, blog };
