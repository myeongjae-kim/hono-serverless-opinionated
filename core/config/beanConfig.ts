import { ArticleMockAdapter } from "@/core/article/adapter/out/ArticleMockAdapter.ts";
import { ArticlePersistenceAdapter } from "@/core/article/adapter/out/ArticlePersistenceAdapter.ts";
import { JwtTokenCodecAdapter } from "@/core/auth/adapter/out/JwtTokenCodecAdapter.ts";
import { TransactionTemplate } from "@/core/common/adapter/out/TransactionTemplate.ts";
import type { AutowiredBeans } from "@/core/config/DependencyTokens.ts";
import { useCaseBeanConfig } from "@/core/config/UseCaseBeanConfig.ts";
import { env } from "@/core/config/env.ts";
import { BcryptPasswordHasherAdapter } from "@/core/user/adapter/out/BcryptPasswordHasherAdapter.ts";
import { UserMockAdapter } from "@/core/user/adapter/out/UserMockAdapter.ts";
import { UserPersistenceAdapter } from "@/core/user/adapter/out/UserPersistenceAdapter.ts";
import { type DbClientSelector, selectDbClient } from "@/lib/db/drizzle.ts";
import type { BeanConfig } from "inversify-typesafe-spring-like";

export type Beans = AutowiredBeans & {
  DbClientSelector: DbClientSelector;
  TransactionTemplate: TransactionTemplate;
};

export const beanConfig: BeanConfig<Beans> = {
  ...useCaseBeanConfig,
  AuthSecret: (bind) => bind().toConstantValue(env.AUTH_SECRET),
  TokenCodecPort: (bind) => bind().to(JwtTokenCodecAdapter),
  PasswordHasherPort: (bind) => bind().to(BcryptPasswordHasherAdapter),
  TransactionPort: (bind) =>
    bind().toResolvedValue((it) => it as TransactionTemplate, [
      "TransactionTemplate",
    ]),
  DbClientSelector: (bind) => bind().toConstantValue(selectDbClient),
  TransactionTemplate: (bind) =>
    bind().to(TransactionTemplate).inSingletonScope(),

  ArticleCommandPort: (bind) => {
    const adapter = env.USE_MOCK_ADAPTER
      ? ArticleMockAdapter
      : ArticlePersistenceAdapter;

    return bind().to(adapter);
  },
  ArticleQueryPort: (bind) =>
    bind().toResolvedValue(
      (it) => it as ArticleMockAdapter | ArticlePersistenceAdapter,
      ["ArticleCommandPort"],
    ),

  UserCommandPort: (bind) => {
    const adapter = env.USE_MOCK_ADAPTER
      ? UserMockAdapter
      : UserPersistenceAdapter;

    return bind().to(adapter);
  },
  UserQueryPort: (bind) =>
    bind().toResolvedValue(
      (it) => it as UserMockAdapter | UserPersistenceAdapter,
      ["UserCommandPort"],
    ),
};
