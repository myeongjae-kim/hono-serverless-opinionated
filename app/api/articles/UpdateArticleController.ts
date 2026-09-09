import { Controller } from "@/app/api/config/Controller.ts";
import type { UpdateArticleUseCase } from "@/core/article/application/port/in/UpdateArticleUseCase.ts";
import { articleUpdateSchema } from "@/core/article/domain/Article.ts";
import { DomainNotFoundError } from "@/core/common/domain/DomainNotFoundError.ts";
import { createRoute, z } from "@hono/zod-openapi";

const route = createRoute({
  method: "put",
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
    body: {
      content: {
        "application/json": {
          schema: articleUpdateSchema,
        },
      },
      description: "The article update schema",
      required: true,
    },
  },
  responses: {
    204: {
      description: "Article updated successfully",
    },
  },
});

const buildController = (useCase: UpdateArticleUseCase) =>
  Controller().openapi(route, async (c) => {
    const id = Number(c.req.valid("param").id);

    if (isNaN(id)) {
      throw new DomainNotFoundError(c.req.valid("param").id, "Article");
    }

    await useCase.update(id, c.req.valid("json"));
    return c.body(null, 204);
  });
export function createUpdateArticleController(
  useCase: UpdateArticleUseCase,
): ReturnType<typeof buildController> {
  return buildController(useCase);
}
