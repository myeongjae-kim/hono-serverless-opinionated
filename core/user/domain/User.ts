import { z } from "zod";

export const userSchema = z.object({
  id: z.number().describe("The user id"),
  ulid: z.string().describe("The user ulid"),
  name: z.string().nullable().describe("The user name"),
  loginId: z.string().describe("The user login id"),
  role: z.string().describe("The user role"),
  createdAt: z.date().describe("The user created at"),
  updatedAt: z.date().describe("The user updated at"),
}).describe("The user schema");

export type User = z.infer<typeof userSchema>;

export const userSignUpSchema = z.object({
  loginId: z.string().describe("The user login id"),
  password: z.string().describe("The user password"),
  name: z.string().optional().describe("The user name"),
}).describe("The user sign up schema");

export type UserSignUp = z.infer<typeof userSignUpSchema>;

export const userLoginSchema = z.object({
  loginId: z.string().describe("The user login id"),
  password: z.string().describe("The user password"),
}).describe("The user login schema");

export type UserLogin = z.infer<typeof userLoginSchema>;

export const refreshTokenSchema = z.object({
  refresh_token: z.string().describe("The refresh token"),
}).describe("The refresh token schema");

export type RefreshToken = z.infer<typeof refreshTokenSchema>;
