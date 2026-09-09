import type { GenerateTokenUseCase } from "@/core/auth/application/port/in/GenerateTokenUseCase.ts";
import { UserDetails } from "@/core/auth/domain/UserDetails.ts";
import type { TransactionPort } from "@/core/common/application/port/out/TransactionPort.ts";
import type { AuthResponse } from "@/core/common/domain/AuthResponse.ts";
import { DomainBadRequestError } from "@/core/common/domain/DomainBadRequestError.ts";
import { Autowired } from "@/core/config/Autowired.ts";
import type { SignUpUseCase } from "@/core/user/application/port/in/SignUpUseCase.ts";
import type { PasswordHasherPort } from "@/core/user/application/port/out/PasswordHasherPort.ts";
import type { UserCommandPort } from "@/core/user/application/port/out/UserCommandPort.ts";
import type { UserQueryPort } from "@/core/user/application/port/out/UserQueryPort.ts";
import type { UserSignUp } from "@/core/user/domain/User.ts";
import { ulid } from "@std/ulid";

export class UserCommandService implements SignUpUseCase {
  constructor(
    @Autowired("UserCommandPort") private readonly userCommandPort:
      UserCommandPort,
    @Autowired("UserQueryPort") private readonly userQueryPort: UserQueryPort,
    @Autowired("GenerateTokenUseCase") private readonly generateTokenUseCase:
      GenerateTokenUseCase,
    @Autowired("TransactionPort") private readonly transactionPort:
      TransactionPort,
    @Autowired("PasswordHasherPort") private readonly passwordHasher:
      PasswordHasherPort,
  ) {}

  async signUp(userData: UserSignUp): Promise<AuthResponse> {
    const passwordHash = await this.passwordHasher.hash(userData.password);
    return await this.transactionPort.run({ useReplica: false }, async () => {
      const userUlid = ulid();

      const existingUser = await this.userQueryPort.findByLoginId(
        userData.loginId,
        { useReplica: false },
      );
      if (existingUser) {
        throw new DomainBadRequestError(
          "User with this loginId already exists",
        );
      }

      const createdUser = await this.userCommandPort.createUser({
        ...userData,
        ulid: userUlid,
        passwordHash,
      });

      const user = await this.userQueryPort.findByUlid(createdUser.ulid, {
        useReplica: false,
      });
      if (!user) {
        throw new Error("User not found after creation");
      }

      const userDetails = new UserDetails(user.ulid, user.role);
      return this.generateTokenUseCase.generateToken(userDetails);
    });
  }
}
