import { Controller } from "@/app/api/config/Controller.ts";
import type { CreateArticleUseCase } from "@/core/article/application/port/in/CreateArticleUseCase.ts";
import { articleCreationSchema } from "@/core/article/domain/Article.ts";
import { creationResponseSchema } from "@/core/common/domain/CreationResponse.ts";
import { createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "post",
  path: "/articles",
  security: [{
    bearerAuth: [],
  }],
  tags: ["articles"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: articleCreationSchema,
        },
      },
      description: "The article creation schema",
      required: true,
    },
  },
  responses: {
    200: {
      description: "The article creation response schema",
      content: { "application/json": { schema: creationResponseSchema } },
    },
  },
});

const buildController = (useCase: CreateArticleUseCase) =>
  Controller().openapi(route, async (c) => {
    const article = await useCase.create(c.req.valid("json"));

    return c.json(creationResponseSchema.parse(article));
  });
export function createArticleController(
  useCase: CreateArticleUseCase,
): ReturnType<typeof buildController> {
  return buildController(useCase);
}
