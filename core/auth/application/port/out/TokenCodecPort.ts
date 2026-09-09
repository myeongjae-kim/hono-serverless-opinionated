import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "@/core/auth/domain/TokenPayload.ts";
import type { UserDetails } from "@/core/auth/domain/UserDetails.ts";

export interface TokenCodecPort {
  signAccessToken(user: UserDetails): string;
  signRefreshToken(ulid: string): string;
  verifyAccessToken(token: string): AccessTokenPayload | null;
  verifyRefreshToken(token: string): RefreshTokenPayload | null;
}
