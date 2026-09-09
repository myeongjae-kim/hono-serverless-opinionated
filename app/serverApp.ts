import { createApiControllers } from "@/app/api/config/ApiControllerConfig.ts";
import { createApiAuthMiddleware } from "@/app/api/config/ApiRuntimeConfig.ts";
import { globalErrorHandler } from "@/app/api/config/globalErrorHandler.ts";
import type { AuthContext } from "@/core/auth/domain/AuthContext.ts";
import { env } from "@/core/config/env.ts";
import { $, OpenAPIHono } from "@hono/zod-openapi";

const serverApp = $(
  new OpenAPIHono<{ Variables: AuthContext }>()
    .get("/", (c) => c.json({ status: "ok1" }))
    .get("/health", (c) => c.json({ status: "ok" })),
)
  .basePath("/api");

// basic settings
serverApp.use("/*", createApiAuthMiddleware()).onError(globalErrorHandler);

// docs
serverApp.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
});

if (env.PROFILE !== "prod") {
  serverApp.doc("/swagger", (c) => ({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "My API",
    },
    servers: [
      {
        url: new URL(c.req.url).origin,
        description: "Current environment",
      },
    ],
  }));
  serverApp.get("/docs", (c) => {
    return c.html(`<!doctype html>
<html>

<head>
  <title>API Docs</title>
  <meta charset="utf-8" />
  <meta content="width=device-width, initial-scale=1" name="viewport" />
</head>

<body>
  <div id="app"></div>

  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>

  <script>
    Scalar.createApiReference('#app', {
      servers: [
        {
          url: window.location.origin,
          description: '',
        },
      ],
      url: "/api/swagger",
      defaultOpenAllTags: true,
      authentication: {
        preferredSecurityScheme: 'bearerAuth',
        securitySchemes: {
          bearerAuth: {
            token: 'default-token-value-for-docs',
          }
        }
      }
    })
  </script>
</body>

</html>`);
  });
}

for (const controller of createApiControllers()) {
  serverApp.route("/", controller);
}

export default serverApp;
