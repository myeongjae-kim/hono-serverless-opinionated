import type { UseCaseBeans } from "@/core/config/DependencyTokens.ts";
import { applicationContext } from "@/core/config/applicationContext.ts";

export function getUseCase<K extends keyof UseCaseBeans>(
  name: K,
): UseCaseBeans[K] {
  return applicationContext().get(name);
}
