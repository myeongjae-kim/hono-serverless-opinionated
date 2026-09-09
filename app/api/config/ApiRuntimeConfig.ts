import { createAuthMiddleware } from "@/app/api/config/authMiddleware.ts";
import { env } from "@/core/config/env.ts";
import { getUseCase } from "@/core/config/getUseCase.ts";

export function createApiAuthMiddleware(): ReturnType<
  typeof createAuthMiddleware
> {
  return createAuthMiddleware(
    getUseCase("VerifyAccessTokenUseCase"),
    env.USE_MOCK_ADAPTER,
  );
}
