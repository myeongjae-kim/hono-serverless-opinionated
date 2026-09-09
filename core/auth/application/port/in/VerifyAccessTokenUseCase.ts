import type { UserDetails } from "@/core/auth/domain/UserDetails.ts";

export interface VerifyAccessTokenUseCase {
  verify(token: string): UserDetails | null;
}
