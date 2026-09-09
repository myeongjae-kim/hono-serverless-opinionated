import { JwtTokenCodecAdapter } from "@/core/auth/adapter/out/JwtTokenCodecAdapter.ts";
import { UserDetails } from "@/core/auth/domain/UserDetails.ts";
import { assertEquals } from "@std/assert";
import jwt from "jsonwebtoken";

const secret = "unit-test-secret";
const codec = new JwtTokenCodecAdapter(secret);
const user = new UserDetails("01ARZ3NDEKTSV4RRFFQ69G5FAV", "member");
Deno.test("tokens round trip and cannot be used for the other purpose", () => {
  const access = codec.signAccessToken(user);
  const refresh = codec.signRefreshToken(user.ulid);
  assertEquals(codec.verifyAccessToken(access)?.ulid, user.ulid);
  assertEquals(codec.verifyRefreshToken(refresh)?.ulid, user.ulid);
  assertEquals(codec.verifyAccessToken(refresh), null);
  assertEquals(codec.verifyRefreshToken(access), null);
});
Deno.test("rejects malformed, expired, legacy, wrong algorithm and wrong key tokens", () => {
  const payload = { ulid: user.ulid, role: "member", type: "access" };
  const invalid = [
    "invalid",
    jwt.sign(payload, secret, { expiresIn: -1 }),
    jwt.sign({ ulid: user.ulid, role: "member" }, secret, { expiresIn: "1h" }),
    jwt.sign({ ...payload, ulid: 123 }, secret, { expiresIn: "1h" }),
    jwt.sign({ ...payload, role: {} }, secret, { expiresIn: "1h" }),
    jwt.sign(payload, secret),
    jwt.sign(payload, secret, { algorithm: "HS384", expiresIn: "1h" }),
    jwt.sign(payload, "another-key", { expiresIn: "1h" }),
  ];
  for (const token of invalid) {
    assertEquals(codec.verifyAccessToken(token), null);
  }
  assertEquals(
    codec.verifyRefreshToken(
      jwt.sign({ ulid: 42, type: "refresh" }, secret, { expiresIn: "1h" }),
    ),
    null,
  );
});
