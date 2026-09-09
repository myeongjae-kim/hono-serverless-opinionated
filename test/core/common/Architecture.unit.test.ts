import { checkSource } from "@/scripts/checkArchitecture.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("architecture checks reject relative imports and cross-domain outbound dependencies", () => {
  assert(
    checkSource(
      "core/user/application/Test.ts",
      'import { db } from "../../../lib/db/drizzle.ts";',
    ).length > 0,
  );
  assert(
    checkSource(
      "core/user/application/Test.ts",
      'import type { Port } from "@/core/auth/application/port/out/TokenCodecPort.ts";',
    ).length > 0,
  );
  assert(
    checkSource(
      "app/api/users/Test.ts",
      'import { getUseCase } from "@/core/config/getUseCase.ts";',
    ).length > 0,
  );
  assertEquals(
    checkSource(
      "core/user/application/Test.ts",
      'import type { UseCase } from "@/core/auth/application/port/in/VerifyAccessTokenUseCase.ts";',
    ),
    [],
  );
});
