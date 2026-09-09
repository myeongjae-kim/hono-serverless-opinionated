import { Controller } from "@/app/api/config/Controller.ts";
import { authResponseSchema } from "@/core/common/domain/AuthResponse.ts";
import type { RefreshTokenUseCase } from "@/core/user/application/port/in/RefreshTokenUseCase.ts";
import { refreshTokenSchema } from "@/core/user/domain/User.ts";
import { createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "post",
  path: "/users/refresh",
  tags: ["users"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: refreshTokenSchema,
        },
      },
      description: "The refresh token schema",
      required: true,
    },
  },
  responses: {
    200: {
      description: "The authentication response schema",
      content: {
        "application/json": {
          schema: authResponseSchema,
        },
      },
    },
  },
});

const buildController = (useCase: RefreshTokenUseCase) =>
  Controller().openapi(route, async (c) => {
    const authResponse = await useCase.refreshToken(c.req.valid("json"));

    return c.json(authResponseSchema.parse(authResponse));
  });

export function createRefreshTokenController(
  useCase: RefreshTokenUseCase,
): ReturnType<typeof buildController> {
  return buildController(useCase);
}
