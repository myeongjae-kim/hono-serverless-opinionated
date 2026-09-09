import type { TransactionPort } from "@/core/common/application/port/out/TransactionPort.ts";
import type { SqlOptions } from "@/core/common/domain/SqlOptions.ts";
import { Autowired } from "@/core/config/InfrastructureAutowired.ts";
import type { DatabaseClient, DbClientSelector } from "@/lib/db/drizzle.ts";
import type { MySqlTransactionConfig } from "drizzle-orm/mysql-core";
import { AsyncLocalStorage } from "node:async_hooks";

type TransactionClient = Parameters<
  Parameters<DatabaseClient["transaction"]>[0]
>[0];
type TransactionContext = {
  tx: TransactionClient;
  useReplica: boolean;
  active: boolean;
  rollbackOnly: boolean;
};

export class TransactionTemplate implements TransactionPort {
  private readonly storage = new AsyncLocalStorage<TransactionContext>();
  constructor(
    @Autowired("DbClientSelector") private readonly dbClientSelector:
      DbClientSelector,
  ) {}

  run<T>(options: SqlOptions, work: () => Promise<T>): Promise<T> {
    return this.execute(options, () => work());
  }

  async execute<T>(
    options: SqlOptions,
    work: (tx: TransactionClient) => Promise<T>,
    config?: Partial<Omit<MySqlTransactionConfig, "accessMode">>,
  ): Promise<T> {
    const current = this.storage.getStore();
    if (current) {
      if (!current.active) throw new Error("Transaction has already completed");
      try {
        if (current.useReplica && !options.useReplica) {
          throw new Error("Cannot write inside a replica transaction");
        }
        if (config) {
          throw new Error(
            "Nested transactions cannot override transaction configuration",
          );
        }
        return await work(current.tx);
      } catch (error) {
        current.rollbackOnly = true;
        throw error;
      }
    }
    return this.dbClientSelector(options).transaction(async (tx) => {
      const context: TransactionContext = {
        tx,
        useReplica: options.useReplica,
        active: true,
        rollbackOnly: false,
      };
      return await this.storage.run(context, async () => {
        try {
          const result = await work(tx);
          if (context.rollbackOnly) {
            throw new Error(
              "Transaction marked for rollback by a nested failure",
            );
          }
          return result;
        } finally {
          context.active = false;
        }
      });
    }, {
      isolationLevel: "repeatable read",
      ...config,
      accessMode: options.useReplica ? "read only" : "read write",
    });
  }
}
