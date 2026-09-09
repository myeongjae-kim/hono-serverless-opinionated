import type { VerifyRefreshTokenUseCase } from "@/core/auth/application/port/in/VerifyRefreshTokenUseCase.ts";
import type { TokenCodecPort } from "@/core/auth/application/port/out/TokenCodecPort.ts";
import type { RefreshTokenPayload } from "@/core/auth/domain/TokenPayload.ts";
import { Autowired } from "@/core/config/Autowired.ts";

export class VerifyRefreshTokenService implements VerifyRefreshTokenUseCase {
  constructor(
    @Autowired("TokenCodecPort") private readonly codec: TokenCodecPort,
  ) {}
  verify(token: string): RefreshTokenPayload | null {
    return this.codec.verifyRefreshToken(token);
  }
}
