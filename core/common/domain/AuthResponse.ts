import { z } from "zod";

export const authResponseSchema = z.object({
  access_token: z.string().describe("The access token (JWT)"),
  refresh_token: z.string().describe("The refresh token (JWT)"),
}).describe("The authentication response schema");

export type AuthResponse = z.infer<typeof authResponseSchema>;
