import type { AutowiredBeans } from "@/core/config/DependencyTokens.ts";
import { returnAutowired } from "inversify-typesafe-spring-like";

export const { Autowired } = returnAutowired<AutowiredBeans>();
