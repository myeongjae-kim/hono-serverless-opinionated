import type { VerifyAccessTokenUseCase } from "@/core/auth/application/port/in/VerifyAccessTokenUseCase.ts";
import type { TokenCodecPort } from "@/core/auth/application/port/out/TokenCodecPort.ts";
import { UserDetails } from "@/core/auth/domain/UserDetails.ts";
import { Autowired } from "@/core/config/Autowired.ts";

export class VerifyAccessTokenService implements VerifyAccessTokenUseCase {
  constructor(
    @Autowired("TokenCodecPort") private readonly codec: TokenCodecPort,
  ) {}
  verify(token: string): UserDetails | null {
    const payload = this.codec.verifyAccessToken(token);
    return payload ? new UserDetails(payload.ulid, payload.role) : null;
  }
}
