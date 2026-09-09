import { z } from "zod";

const base = z.object({
  ulid: z.string().min(1),
  exp: z.number().int().positive(),
  iat: z.number().int().nonnegative(),
});
export const accessTokenPayloadSchema = base.extend({
  type: z.literal("access"),
  role: z.string().min(1),
});
export const refreshTokenPayloadSchema = base.extend({
  type: z.literal("refresh"),
});
export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
export type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;
