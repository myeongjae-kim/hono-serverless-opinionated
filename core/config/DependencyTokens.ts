import type { CreateArticleUseCase } from "@/core/article/application/port/in/CreateArticleUseCase.ts";
import type { DeleteArticleUseCase } from "@/core/article/application/port/in/DeleteArticleUseCase.ts";
import type { FindAllArticlesUseCase } from "@/core/article/application/port/in/FindAllArticlesUseCase.ts";
import type { GetArticleByIdUseCase } from "@/core/article/application/port/in/GetArticleByIdUseCase.ts";
import type { UpdateArticleUseCase } from "@/core/article/application/port/in/UpdateArticleUseCase.ts";
import type { ArticleCommandPort } from "@/core/article/application/port/out/ArticleCommandPort.ts";
import type { ArticleQueryPort } from "@/core/article/application/port/out/ArticleQueryPort.ts";
import type { GenerateTokenUseCase } from "@/core/auth/application/port/in/GenerateTokenUseCase.ts";
import type { VerifyAccessTokenUseCase } from "@/core/auth/application/port/in/VerifyAccessTokenUseCase.ts";
import type { VerifyRefreshTokenUseCase } from "@/core/auth/application/port/in/VerifyRefreshTokenUseCase.ts";
import type { TokenCodecPort } from "@/core/auth/application/port/out/TokenCodecPort.ts";
import type { TransactionPort } from "@/core/common/application/port/out/TransactionPort.ts";
import type { LoginUseCase } from "@/core/user/application/port/in/LoginUseCase.ts";
import type { RefreshTokenUseCase } from "@/core/user/application/port/in/RefreshTokenUseCase.ts";
import type { SignUpUseCase } from "@/core/user/application/port/in/SignUpUseCase.ts";
import type { PasswordHasherPort } from "@/core/user/application/port/out/PasswordHasherPort.ts";
import type { UserCommandPort } from "@/core/user/application/port/out/UserCommandPort.ts";
import type { UserQueryPort } from "@/core/user/application/port/out/UserQueryPort.ts";

export type UseCaseBeans = {
  VerifyRefreshTokenUseCase: VerifyRefreshTokenUseCase;
  CreateArticleUseCase: CreateArticleUseCase;
  UpdateArticleUseCase: UpdateArticleUseCase;
  DeleteArticleUseCase: DeleteArticleUseCase;
  GetArticleByIdUseCase: GetArticleByIdUseCase;
  FindAllArticlesUseCase: FindAllArticlesUseCase;
  SignUpUseCase: SignUpUseCase;
  LoginUseCase: LoginUseCase;
  RefreshTokenUseCase: RefreshTokenUseCase;
  GenerateTokenUseCase: GenerateTokenUseCase;
  VerifyAccessTokenUseCase: VerifyAccessTokenUseCase;
};
export type OutboundPortBeans = {
  ArticleCommandPort: ArticleCommandPort;
  ArticleQueryPort: ArticleQueryPort;
  UserCommandPort: UserCommandPort;
  UserQueryPort: UserQueryPort;
  TransactionPort: TransactionPort;
  TokenCodecPort: TokenCodecPort;
  PasswordHasherPort: PasswordHasherPort;
};
export type ConfigurationBeans = { AuthSecret: string };
export type AutowiredBeans =
  & UseCaseBeans
  & OutboundPortBeans
  & ConfigurationBeans;
