import type { VerifyAccessTokenUseCase } from "@/core/auth/application/port/in/VerifyAccessTokenUseCase.ts";
import { isApiAuthRequired } from "@/core/auth/config/securityConfig.ts";
import type { AuthContext } from "@/core/auth/domain/AuthContext.ts";
import { UserDetails } from "@/core/auth/domain/UserDetails.ts";
import { DomainUnauthorizedError } from "@/core/common/domain/DomainUnauthorizedError.ts";
import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

export function createAuthMiddleware(
  verifyAccessToken: VerifyAccessTokenUseCase,
  useMockAdapter: boolean,
): MiddlewareHandler<{ Variables: AuthContext }> {
  return createMiddleware<{ Variables: AuthContext }>(async (c, next) => {
    const header = c.req.header("Authorization");
    let principal: UserDetails | null = null;
    if (header) {
      const match = /^Bearer ([^\s]+)$/.exec(header);
      if (!match) {
        throw new DomainUnauthorizedError(
          "Invalid or missing authentication token",
        );
      }
      principal = useMockAdapter
        ? match[1] === "default-token-value-for-docs"
          ? new UserDetails("ulid", "member")
          : null
        : verifyAccessToken.verify(match[1]);
      if (!principal) {
        throw new DomainUnauthorizedError(
          "Invalid or missing authentication token",
        );
      }
    }
    if (!principal && isApiAuthRequired(c.req.method, c.req.path)) {
      throw new DomainUnauthorizedError(
        "Invalid or missing authentication token",
      );
    }
    c.set("principal", principal);
    await next();
  });
}
