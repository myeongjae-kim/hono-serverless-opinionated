import type { AuthResponse } from "@/core/common/domain/AuthResponse.ts";
import type { UserLogin } from "@/core/user/domain/User.ts";

export interface LoginUseCase {
  login(user: UserLogin): Promise<AuthResponse>;
}
