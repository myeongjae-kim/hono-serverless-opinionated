import { createArticleController } from "@/app/api/articles/CreateArticleController.ts";
import { createDeleteArticleController } from "@/app/api/articles/DeleteArticleController.ts";
import { createFindAllArticlesController } from "@/app/api/articles/FindAllArticlesController.ts";
import { createGetArticleByIdController } from "@/app/api/articles/GetArticleByIdController.ts";
import { createUpdateArticleController } from "@/app/api/articles/UpdateArticleController.ts";
import { createLoginController } from "@/app/api/users/login/LoginController.ts";
import { createGetCurrentUserController } from "@/app/api/users/me/GetCurrentUserController.ts";
import { createRefreshTokenController } from "@/app/api/users/refresh/RefreshTokenController.ts";
import { createSignUpController } from "@/app/api/users/signup/SignUpController.ts";
import { getUseCase } from "@/core/config/getUseCase.ts";

const buildControllers = () =>
  [
    createArticleController(getUseCase("CreateArticleUseCase")),
    createDeleteArticleController(getUseCase("DeleteArticleUseCase")),
    createFindAllArticlesController(getUseCase("FindAllArticlesUseCase")),
    createGetArticleByIdController(getUseCase("GetArticleByIdUseCase")),
    createUpdateArticleController(getUseCase("UpdateArticleUseCase")),
    createLoginController(getUseCase("LoginUseCase")),
    createGetCurrentUserController(),
    createRefreshTokenController(getUseCase("RefreshTokenUseCase")),
    createSignUpController(getUseCase("SignUpUseCase")),
  ] as const;
export function createApiControllers(): ReturnType<typeof buildControllers> {
  return buildControllers();
}
