import { z } from "zod";

export const userDetailsSchema = z.object({
  ulid: z.string().describe("The user ulid"),
  role: z.string().describe("The user role"),
}).describe("The user details schema");

type UserDetailsType = z.infer<typeof userDetailsSchema>;

export class UserDetails implements UserDetailsType {
  constructor(
    public readonly ulid: string,
    public readonly role: string,
  ) {}
}
