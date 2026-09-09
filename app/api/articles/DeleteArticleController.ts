import { Controller } from "@/app/api/config/Controller.ts";
import type { DeleteArticleUseCase } from "@/core/article/application/port/in/DeleteArticleUseCase.ts";
import { DomainNotFoundError } from "@/core/common/domain/DomainNotFoundError.ts";
import { createRoute, z } from "@hono/zod-openapi";

const route = createRoute({
  method: "delete",
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
    204: {
      description: "Article deleted successfully",
    },
  },
});

const buildController = (useCase: DeleteArticleUseCase) =>
  Controller().openapi(route, async (c) => {
    const id = Number(c.req.valid("param").id);

    if (isNaN(id)) {
      throw new DomainNotFoundError(c.req.valid("param").id, "Article");
    }

    await useCase.delete(id);

    return c.body(null, 204);
  });
export function createDeleteArticleController(
  useCase: DeleteArticleUseCase,
): ReturnType<typeof buildController> {
  return buildController(useCase);
}
