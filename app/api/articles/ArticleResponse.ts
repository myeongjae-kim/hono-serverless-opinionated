import { articleSchema } from "@/core/article/domain/Article.ts";
import type { Article } from "@/core/article/domain/Article.ts";
import { z } from "@hono/zod-openapi";

export const articleResponseSchema = articleSchema.extend({
  createdAt: z.iso.datetime().openapi({
    description: "Creation timestamp in UTC",
  }),
  updatedAt: z.iso.datetime().openapi({
    description: "Last update timestamp in UTC",
  }),
}).openapi("ArticleResponse");
export const articleListResponseSchema = z.object({
  content: articleResponseSchema.array(),
}).openapi("ArticleListResponse");
export function toArticleResponse(
  article: Article,
): z.infer<typeof articleResponseSchema> {
  return articleResponseSchema.parse({
    ...article,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  });
}
