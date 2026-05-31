import { defineCollection, z } from 'astro:content';

const postSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  typechoCid: z.number(),
  typechoSlug: z.string(),
  draft: z.boolean().default(false),
});

const pageSchema = z.object({
  title: z.string(),
  date: z.coerce.date().optional(),
  typechoCid: z.number(),
  pageSlug: z.string(),
  template: z.enum(['default', 'links', 'tools']).default('default'),
  order: z.number().default(0),
});

const posts = defineCollection({
  type: 'content',
  schema: postSchema,
});

const pages = defineCollection({
  type: 'content',
  schema: pageSchema,
});

export const collections = { posts, pages };
