import type { ArticleCommandPort } from "@/core/article/application/port/out/ArticleCommandPort.ts";
import type { ArticleQueryPort } from "@/core/article/application/port/out/ArticleQueryPort.ts";
import type {
  Article,
  ArticleCreation,
  ArticleUpdate,
} from "@/core/article/domain/Article.ts";
import type { TransactionTemplate } from "@/core/common/adapter/out/TransactionTemplate.ts";
import { DomainNotFoundError } from "@/core/common/domain/DomainNotFoundError.ts";
import type { SqlOptions } from "@/core/common/domain/SqlOptions.ts";
import { withDatabaseErrorHandling } from "@/core/common/util/withDatabaseErrorHandling.ts";
import { Autowired } from "@/core/config/InfrastructureAutowired.ts";
import { article } from "@/lib/db/schema.ts";
import { eq } from "drizzle-orm";

export class ArticlePersistenceAdapter
  implements ArticleCommandPort, ArticleQueryPort {
  constructor(
    @Autowired("TransactionTemplate") private readonly transactionTemplate:
      TransactionTemplate,
  ) {
    return withDatabaseErrorHandling(this);
  }

  async findAll(sqlOptions: SqlOptions): Promise<Article[]> {
    return await this.transactionTemplate.execute(sqlOptions, async (tx) => {
      const results = await tx.select().from(article);

      return results.map((row) => {
        return ({
          id: row.id,
          title: row.title,
          content: row.content,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      });
    });
  }

  async getById(id: Article["id"], sqlOptions: SqlOptions): Promise<Article> {
    return await this.transactionTemplate.execute(sqlOptions, async (tx) => {
      const results = await tx.select().from(article).where(eq(article.id, id))
        .limit(1);

      const row = results[0];
      if (!row) {
        throw new DomainNotFoundError(id, "Article");
      }

      return {
        id: row.id,
        title: row.title,
        content: row.content,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
  }

  async createArticle(
    articleData: ArticleCreation,
  ): Promise<Pick<Article, "id">> {
    return await this.transactionTemplate.execute(
      { useReplica: false },
      async (tx) => {
        const result = await tx.insert(article).values({
          title: articleData.title,
          content: articleData.content,
        });

        return {
          id: Number(result[0].insertId),
        };
      },
    );
  }

  async updateArticle(
    id: Article["id"],
    articleData: ArticleUpdate,
  ): Promise<void> {
    return await this.transactionTemplate.execute(
      { useReplica: false },
      async (tx) => {
        await tx.update(article)
          .set({
            ...(articleData.title !== undefined &&
              { title: articleData.title }),
            ...(articleData.content !== undefined &&
              { content: articleData.content }),
            updatedAt: new Date(),
          })
          .where(eq(article.id, id));
      },
    );
  }

  async deleteArticle(id: Article["id"]): Promise<void> {
    return await this.transactionTemplate.execute(
      { useReplica: false },
      async (tx) => {
        await tx.delete(article).where(eq(article.id, id));
      },
    );
  }
}
