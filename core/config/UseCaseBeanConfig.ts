import { ArticleCommandService } from "@/core/article/application/ArticleCommandService.ts";
import { ArticleQueryService } from "@/core/article/application/ArticleQueryService.ts";
import { TokenService } from "@/core/auth/application/TokenService.ts";
import { VerifyAccessTokenService } from "@/core/auth/application/VerifyAccessTokenService.ts";
import { VerifyRefreshTokenService } from "@/core/auth/application/VerifyRefreshTokenService.ts";
import type { UseCaseBeans } from "@/core/config/DependencyTokens.ts";
import { UserCommandService } from "@/core/user/application/UserCommandService.ts";
import { UserQueryService } from "@/core/user/application/UserQueryService.ts";
import type { BeanConfig } from "inversify-typesafe-spring-like";

export const useCaseBeanConfig: BeanConfig<UseCaseBeans> = {
  VerifyRefreshTokenUseCase: (bind) => bind().to(VerifyRefreshTokenService),
  VerifyAccessTokenUseCase: (bind) => bind().to(VerifyAccessTokenService),
  CreateArticleUseCase: (bind) => bind().to(ArticleCommandService),
  UpdateArticleUseCase: (bind) =>
    bind().toResolvedValue((it) => it as ArticleCommandService, [
      "CreateArticleUseCase",
    ]),
  DeleteArticleUseCase: (bind) =>
    bind().toResolvedValue((it) => it as ArticleCommandService, [
      "CreateArticleUseCase",
    ]),
  GetArticleByIdUseCase: (bind) => bind().to(ArticleQueryService),
  FindAllArticlesUseCase: (bind) =>
    bind().toResolvedValue((it) => it as ArticleQueryService, [
      "GetArticleByIdUseCase",
    ]),
  SignUpUseCase: (bind) => bind().to(UserCommandService),
  LoginUseCase: (bind) => bind().to(UserQueryService),
  RefreshTokenUseCase: (bind) =>
    bind().toResolvedValue((it) => it as UserQueryService, ["LoginUseCase"]),
  GenerateTokenUseCase: (bind) => bind().to(TokenService),
};
