import { ArticlePersistenceAdapter } from "@/core/article/adapter/out/ArticlePersistenceAdapter.ts";
import { TransactionTemplate } from "@/core/common/adapter/out/TransactionTemplate.ts";
import { applicationContext } from "@/core/config/applicationContext.ts";
import { UserPersistenceAdapter } from "@/core/user/adapter/out/UserPersistenceAdapter.ts";
import { UserCommandService } from "@/core/user/application/UserCommandService.ts";
import { article, user } from "@/lib/db/schema.ts";
import { dbLocal } from "@/test/dbLocal.ts";
import { intTestDefaultOptions } from "@/test/intTestDefaultOptions.ts";
import { assertEquals, assertRejects, assertStrictEquals } from "@std/assert";
import { eq } from "drizzle-orm";

Deno.test({
  name: "transaction joins adapter writes and rolls them back on later failure",
  ...intTestDefaultOptions,
  fn: async () => {
    const transaction = new TransactionTemplate(() => dbLocal);
    const adapter = new ArticlePersistenceAdapter(transaction);
    let id = 0;
    await assertRejects(
      () =>
        transaction.run({ useReplica: false }, async () => {
          id = (await adapter.createArticle({
            title: "rollback",
            content: "test",
          })).id;
          assertEquals(
            (await adapter.getById(id, { useReplica: true })).title,
            "rollback",
          );
          throw new Error("later failure");
        }),
      Error,
      "later failure",
    );
    assertEquals(
      await dbLocal.select().from(article).where(eq(article.id, id)),
      [],
    );
  },
});
Deno.test({
  name: "nested transaction uses same client and primary selection",
  ...intTestDefaultOptions,
  fn: async () => {
    const selections: boolean[] = [];
    const transaction = new TransactionTemplate((options) => {
      selections.push(options?.useReplica ?? false);
      return dbLocal;
    });
    await transaction.execute({ useReplica: false }, async (tx) => {
      await transaction.execute({ useReplica: true }, (nested) => {
        assertStrictEquals(tx, nested);
        return Promise.resolve();
      });
    });
    assertEquals(selections, [false]);
  },
});
Deno.test({
  name: "caught nested failures still roll back the outer transaction",
  ...intTestDefaultOptions,
  fn: async () => {
    const transaction = new TransactionTemplate(() => dbLocal);
    const adapter = new ArticlePersistenceAdapter(transaction);
    let id = 0;
    await assertRejects(
      () =>
        transaction.run({ useReplica: false }, async () => {
          id = (await adapter.createArticle({
            title: "rollback-only",
            content: "test",
          })).id;
          await assertRejects(() =>
            transaction.run(
              { useReplica: false },
              () => Promise.reject(new Error("nested")),
            )
          );
        }),
      Error,
      "marked for rollback",
    );
    assertEquals(
      await dbLocal.select().from(article).where(eq(article.id, id)),
      [],
    );
  },
});
Deno.test({
  name: "read-only transaction rejects writes",
  ...intTestDefaultOptions,
  fn: async () => {
    const transaction = new TransactionTemplate(() => dbLocal);
    await assertRejects(
      () =>
        transaction.run(
          { useReplica: true },
          () => transaction.run({ useReplica: false }, () => Promise.resolve()),
        ),
      Error,
      "Cannot write",
    );
  },
});
Deno.test({
  name: "concurrent requests do not share transactions",
  ...intTestDefaultOptions,
  fn: async () => {
    const transaction = new TransactionTemplate(() => dbLocal);
    let firstTx: unknown;
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    // Only independent transaction roots run concurrently; queries within each root remain sequential.
    const first = transaction.execute({ useReplica: false }, async (tx) => {
      firstTx = tx;
      entered.resolve();
      await release.promise;
      await transaction.execute({ useReplica: true }, (nested) => {
        assertStrictEquals(nested, tx);
        return Promise.resolve();
      });
    });
    try {
      await entered.promise;
      await transaction.execute({ useReplica: false }, (tx) => {
        assertEquals(tx === firstTx, false);
        return Promise.resolve();
      });
    } finally {
      release.resolve();
      await first;
    }
  },
});
Deno.test({
  name: "signup rolls back user creation if token generation fails",
  ...intTestDefaultOptions,
  fn: async () => {
    const transaction = new TransactionTemplate(() => dbLocal);
    const adapter = new UserPersistenceAdapter(transaction);
    const loginId = `rollback-${crypto.randomUUID()}`;
    const service = new UserCommandService(
      adapter,
      adapter,
      {
        generateToken: () => {
          throw new Error("token failure");
        },
      },
      transaction,
      {
        hash: () => Promise.resolve("hashed"),
        verify: () => Promise.resolve(true),
      },
    );
    await assertRejects(
      () => service.signUp({ loginId, password: "test" }),
      Error,
      "token failure",
    );
    assertEquals(
      await dbLocal.select().from(user).where(eq(user.loginId, loginId)),
      [],
    );
  },
});
Deno.test({
  name: "DI exposes the same transaction runner to applications and adapters",
  ...intTestDefaultOptions,
  fn: () => {
    assertStrictEquals(
      applicationContext().get("TransactionPort"),
      applicationContext().get("TransactionTemplate"),
    );
  },
});

Deno.test({
  name: "detached work cannot reuse a completed transaction",
  ...intTestDefaultOptions,
  fn: async () => {
    const transaction = new TransactionTemplate(() => dbLocal);
    const start = Promise.withResolvers<void>();
    let detached: Promise<void> = Promise.resolve();
    await transaction.run({ useReplica: false }, () => {
      detached = start.promise.then(() =>
        transaction.run({ useReplica: false }, () => Promise.resolve())
      );
      return Promise.resolve();
    });
    const rejected = assertRejects(() => detached, Error, "already completed");
    start.resolve();
    await rejected;
  },
});
