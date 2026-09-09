import type { SqlOptions } from "@/core/common/domain/SqlOptions.ts";

export interface TransactionPort {
  run<T>(options: SqlOptions, work: () => Promise<T>): Promise<T>;
}
