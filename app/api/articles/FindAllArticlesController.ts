import {
  articleListResponseSchema,
  toArticleResponse,
} from "@/app/api/articles/ArticleResponse.ts";
import { Controller } from "@/app/api/config/Controller.ts";
import type { FindAllArticlesUseCase } from "@/core/article/application/port/in/FindAllArticlesUseCase.ts";
import { createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/articles",
  security: [{
    bearerAuth: [],
  }],
  tags: ["articles"],
  responses: {
    200: {
      description: "The article list response schema",
      content: {
        "application/json": {
          schema: articleListResponseSchema,
        },
      },
    },
  },
});

const buildController = (useCase: FindAllArticlesUseCase) =>
  Controller().openapi(route, async (c) => {
    const articles = await useCase.findAll();

    return c.json(articleListResponseSchema.parse({
      content: articles.map(toArticleResponse),
    }));
  });
export function createFindAllArticlesController(
  useCase: FindAllArticlesUseCase,
): ReturnType<typeof buildController> {
  return buildController(useCase);
}
