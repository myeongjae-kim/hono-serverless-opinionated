import type { AuthResponse } from "@/core/common/domain/AuthResponse.ts";
import type { UserSignUp } from "@/core/user/domain/User.ts";

export interface SignUpUseCase {
  signUp(user: UserSignUp): Promise<AuthResponse>;
}
