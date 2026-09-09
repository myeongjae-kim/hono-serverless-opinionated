import { createArticleController } from "@/app/api/articles/CreateArticleController.ts";
import { createGetArticleByIdController } from "@/app/api/articles/GetArticleByIdController.ts";
import { createAuthMiddleware } from "@/app/api/config/authMiddleware.ts";
import { globalErrorHandler } from "@/app/api/config/globalErrorHandler.ts";
import { DomainInternalServerError } from "@/core/common/domain/DomainInternalServerError.ts";
import { OpenAPIHono } from "@hono/zod-openapi";
import { assert, assertEquals } from "@std/assert";
import { DrizzleQueryError } from "drizzle-orm";

Deno.test("controller accepts an explicit use case and documents its response", async () => {
  const app = createArticleController({
    create: (input) => {
      assertEquals(input.title, "Test");
      return Promise.resolve({ id: 7 });
    },
  });
  const response = await app.request("/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Test", content: "Body" }),
  });
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { id: 7 });
  const document = app.getOpenAPIDocument({
    openapi: "3.0.0",
    info: { title: "Test", version: "1" },
  });
  assert(
    JSON.stringify(document.paths?.["/articles"]?.post?.responses[200])
      .includes('"id"'),
  );
});
Deno.test("article dates are ISO strings in JSON and OpenAPI", async () => {
  const date = new Date("2026-01-01T00:00:00.000Z");
  const app = createGetArticleByIdController({
    get: () =>
      Promise.resolve({
        id: 1,
        title: "Test",
        content: "Body",
        createdAt: date,
        updatedAt: date,
      }),
  });
  const response = await app.request("/articles/1");
  assertEquals((await response.json()).createdAt, date.toISOString());
  const document = app.getOpenAPIDocument({
    openapi: "3.0.0",
    info: { title: "Test", version: "1" },
  });
  assert(
    JSON.stringify(document.components?.schemas?.ArticleResponse).includes(
      '"date-time"',
    ),
  );
});
Deno.test("unknown and database failures expose only a fixed message", async () => {
  for (
    const error of [
      new Error("password=private"),
      new DomainInternalServerError("private details"),
      new DrizzleQueryError(
        "select private_data",
        [],
        new Error("duplicate private-value"),
      ),
    ]
  ) {
    const app = new OpenAPIHono().onError(globalErrorHandler).get("/", () => {
      throw error;
    });
    const response = await app.request("/");
    assertEquals(response.status, 500);
    assertEquals(
      (await response.json()).message,
      "An unexpected server error occurred",
    );
  }
});
Deno.test("auth rejects invalid bearer tokens and malformed authorization headers", async () => {
  const app = new OpenAPIHono().use(
    "*",
    createAuthMiddleware({ verify: () => null }, false),
  ).onError(globalErrorHandler).get(
    "/api/users/me",
    (c) => c.json({ ok: true }),
  );
  for (
    const header of ["Bearer invalid", "Basic value", "Bearer token extra"]
  ) {
    const response = await app.request("/api/users/me", {
      headers: { Authorization: header },
    });
    assertEquals(response.status, 401);
  }
});
