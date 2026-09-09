import {
  articleResponseSchema,
  toArticleResponse,
} from "@/app/api/articles/ArticleResponse.ts";
import { Controller } from "@/app/api/config/Controller.ts";
import type { GetArticleByIdUseCase } from "@/core/article/application/port/in/GetArticleByIdUseCase.ts";
import { DomainNotFoundError } from "@/core/common/domain/DomainNotFoundError.ts";
import { createRoute, z } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/articles/{id}",
  security: [{
    bearerAuth: [],
  }],
  tags: ["articles"],
  request: {
    params: z.object({
      id: z.string().openapi({
        param: {
          name: "id",
          in: "path",
        },
        description: "The article id",
      }),
    }),
  },
  responses: {
    200: {
      description: "The article response schema",
      content: {
        "application/json": {
          schema: articleResponseSchema,
        },
      },
    },
  },
});

const buildController = (useCase: GetArticleByIdUseCase) =>
  Controller().openapi(route, async (c) => {
    const id = Number(c.req.valid("param").id);

    if (isNaN(id)) {
      throw new DomainNotFoundError(c.req.valid("param").id, "Article");
    }
    const article = await useCase.get(id);

    return c.json(toArticleResponse(article));
  });
export function createGetArticleByIdController(
  useCase: GetArticleByIdUseCase,
): ReturnType<typeof buildController> {
  return buildController(useCase);
}
