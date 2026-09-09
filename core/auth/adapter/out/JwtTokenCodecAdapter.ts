import type { TokenCodecPort } from "@/core/auth/application/port/out/TokenCodecPort.ts";
import {
  type AccessTokenPayload,
  accessTokenPayloadSchema,
  type RefreshTokenPayload,
  refreshTokenPayloadSchema,
} from "@/core/auth/domain/TokenPayload.ts";
import type { UserDetails } from "@/core/auth/domain/UserDetails.ts";
import { Autowired } from "@/core/config/Autowired.ts";
import jwt from "jsonwebtoken";

export class JwtTokenCodecAdapter implements TokenCodecPort {
  constructor(@Autowired("AuthSecret") private readonly secret: string) {}
  signAccessToken(user: UserDetails): string {
    return jwt.sign(
      { ulid: user.ulid, role: user.role, type: "access" },
      this.secret,
      { algorithm: "HS256", expiresIn: "15m" },
    );
  }
  signRefreshToken(ulid: string): string {
    return jwt.sign({ ulid, type: "refresh" }, this.secret, {
      algorithm: "HS256",
      expiresIn: "180d",
    });
  }
  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const result = accessTokenPayloadSchema.safeParse(
        jwt.verify(token, this.secret, { algorithms: ["HS256"] }),
      );
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }
  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const result = refreshTokenPayloadSchema.safeParse(
        jwt.verify(token, this.secret, { algorithms: ["HS256"] }),
      );
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }
}
