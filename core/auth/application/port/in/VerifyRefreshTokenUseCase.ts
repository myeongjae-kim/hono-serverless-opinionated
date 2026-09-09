import type { RefreshTokenPayload } from "@/core/auth/domain/TokenPayload.ts";

export interface VerifyRefreshTokenUseCase {
  verify(token: string): RefreshTokenPayload | null;
}
