import { z } from "zod";

export const articleSchema = z.object({
  id: z.number().describe("The article id"),
  title: z.string().describe("The article title"),
  content: z.string().describe("The article content"),
  createdAt: z.date().describe("The article created at"),
  updatedAt: z.date().describe("The article updated at"),
}).describe("The article schema");

export type Article = z.infer<typeof articleSchema>;

export const articleCreationSchema = articleSchema
  .omit({ id: true, createdAt: true, updatedAt: true });

export type ArticleCreation = z.infer<typeof articleCreationSchema>;

export const articleUpdateSchema = articleCreationSchema
  .partial();

export type ArticleUpdate = z.infer<typeof articleUpdateSchema>;

export const articleListSchema = z.object({ content: articleSchema.array() });
