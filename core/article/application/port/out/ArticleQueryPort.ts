import type { Article } from "@/core/article/domain/Article.ts";
import type { SqlOptions } from "@/core/common/domain/SqlOptions.ts";

export interface ArticleQueryPort {
  findAll(sqlOptions: SqlOptions): Promise<Article[]>;
  getById(id: Article["id"], sqlOptions: SqlOptions): Promise<Article>;
}
