import type { GenerateTokenUseCase } from "@/core/auth/application/port/in/GenerateTokenUseCase.ts";
import type { VerifyRefreshTokenUseCase } from "@/core/auth/application/port/in/VerifyRefreshTokenUseCase.ts";
import { UserDetails } from "@/core/auth/domain/UserDetails.ts";
import type { AuthResponse } from "@/core/common/domain/AuthResponse.ts";
import { DomainNotFoundError } from "@/core/common/domain/DomainNotFoundError.ts";
import { DomainUnauthorizedError } from "@/core/common/domain/DomainUnauthorizedError.ts";
import { Autowired } from "@/core/config/Autowired.ts";
import type { LoginUseCase } from "@/core/user/application/port/in/LoginUseCase.ts";
import type { RefreshTokenUseCase } from "@/core/user/application/port/in/RefreshTokenUseCase.ts";
import type { PasswordHasherPort } from "@/core/user/application/port/out/PasswordHasherPort.ts";
import type { UserQueryPort } from "@/core/user/application/port/out/UserQueryPort.ts";
import type { RefreshToken, UserLogin } from "@/core/user/domain/User.ts";

export class UserQueryService implements LoginUseCase, RefreshTokenUseCase {
  constructor(
    @Autowired("UserQueryPort") private readonly userQueryPort: UserQueryPort,
    @Autowired("GenerateTokenUseCase") private readonly generateTokenUseCase:
      GenerateTokenUseCase,
    @Autowired("PasswordHasherPort") private readonly passwordHasher:
      PasswordHasherPort,
    @Autowired(
      "VerifyRefreshTokenUseCase",
    ) private readonly verifyRefreshTokenUseCase: VerifyRefreshTokenUseCase,
  ) {}

  async login(userData: UserLogin): Promise<AuthResponse> {
    const user = await this.userQueryPort.findByLoginId(userData.loginId, {
      useReplica: true,
    });

    if (!user) {
      throw new DomainUnauthorizedError("Invalid login credentials");
    }

    const isPasswordValid = await this.passwordHasher.verify(
      userData.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new DomainUnauthorizedError("Invalid login credentials");
    }

    const userDetails = new UserDetails(user.ulid, user.role);
    return this.generateTokenUseCase.generateToken(userDetails);
  }

  async refreshToken(refreshTokenData: RefreshToken): Promise<AuthResponse> {
    const decoded = this.verifyRefreshTokenUseCase.verify(
      refreshTokenData.refresh_token,
    );
    if (!decoded) {
      throw new DomainUnauthorizedError("Invalid or expired refresh token");
    }

    const user = await this.userQueryPort.findByUlid(decoded.ulid, {
      useReplica: true,
    });

    if (!user) {
      throw new DomainNotFoundError(decoded.ulid, "User");
    }

    const userDetails = new UserDetails(user.ulid, user.role);
    return this.generateTokenUseCase.generateToken(userDetails);
  }
}
