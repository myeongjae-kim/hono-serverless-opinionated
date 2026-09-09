import type { GenerateTokenUseCase } from "@/core/auth/application/port/in/GenerateTokenUseCase.ts";
import type { TokenCodecPort } from "@/core/auth/application/port/out/TokenCodecPort.ts";
import type { UserDetails } from "@/core/auth/domain/UserDetails.ts";
import type { AuthResponse } from "@/core/common/domain/AuthResponse.ts";
import { Autowired } from "@/core/config/Autowired.ts";

export class TokenService implements GenerateTokenUseCase {
  constructor(
    @Autowired("TokenCodecPort") private readonly codec: TokenCodecPort,
  ) {}
  generateToken(user: UserDetails): AuthResponse {
    return {
      access_token: this.codec.signAccessToken(user),
      refresh_token: this.codec.signRefreshToken(user.ulid),
    };
  }
}
