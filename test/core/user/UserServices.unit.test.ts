import type { TransactionPort } from "@/core/common/application/port/out/TransactionPort.ts";
import { DomainBadRequestError } from "@/core/common/domain/DomainBadRequestError.ts";
import { DomainUnauthorizedError } from "@/core/common/domain/DomainUnauthorizedError.ts";
import { UserCommandService } from "@/core/user/application/UserCommandService.ts";
import { UserQueryService } from "@/core/user/application/UserQueryService.ts";
import type { UserCommandPort } from "@/core/user/application/port/out/UserCommandPort.ts";
import type {
  UserQueryPort,
  UserWithPasswordHash,
} from "@/core/user/application/port/out/UserQueryPort.ts";
import { assertEquals, assertRejects } from "@std/assert";

const user: UserWithPasswordHash = {
  id: 1,
  ulid: "test-ulid",
  name: null,
  loginId: "member",
  passwordHash: "hashed",
  role: "member",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const tokens = {
  generateToken: () => ({ access_token: "access", refresh_token: "refresh" }),
};
Deno.test("signup hashes before transaction, reads primary, and does not create duplicate users", async () => {
  const events: string[] = [];
  const transaction: TransactionPort = {
    run: (_options, work) => {
      events.push("transaction");
      return work();
    },
  };
  const query: UserQueryPort = {
    findByLoginId: (_loginId, options) => {
      assertEquals(options.useReplica, false);
      return Promise.resolve(user);
    },
    findByUlid: () => Promise.resolve(user),
  };
  const command: UserCommandPort = {
    createUser: () => {
      events.push("create");
      return Promise.resolve(user);
    },
  };
  const service = new UserCommandService(command, query, tokens, transaction, {
    hash: () => {
      events.push("hash");
      return Promise.resolve("hashed");
    },
    verify: () => Promise.resolve(true),
  });
  await assertRejects(
    () => service.signUp({ loginId: "member", password: "secret" }),
    DomainBadRequestError,
  );
  assertEquals(events, ["hash", "transaction"]);
});
Deno.test("login rejects incorrect password and refresh rejects invalid token before reading DB", async () => {
  let reads = 0;
  const query: UserQueryPort = {
    findByLoginId: () => {
      reads++;
      return Promise.resolve(user);
    },
    findByUlid: () => {
      reads++;
      return Promise.resolve(user);
    },
  };
  const service = new UserQueryService(query, tokens, {
    hash: () => Promise.resolve("hashed"),
    verify: () => Promise.resolve(false),
  }, { verify: () => null });
  await assertRejects(
    () => service.login({ loginId: "member", password: "wrong" }),
    DomainUnauthorizedError,
  );
  assertEquals(reads, 1);
  await assertRejects(
    () => service.refreshToken({ refresh_token: "invalid" }),
    DomainUnauthorizedError,
  );
  assertEquals(reads, 1);
});
