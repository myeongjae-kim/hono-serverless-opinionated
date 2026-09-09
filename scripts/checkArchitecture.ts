const root = new URL("../", import.meta.url);

export function checkSource(path: string, source: string): string[] {
  const violations: string[] = [];
  const inner = /^core\/([^/]+)\/(domain|application)\//.exec(path);
  const imports = [
    ...source.matchAll(
      /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g,
    ),
  ];
  for (const [, specifier] of imports) {
    const dependency = specifier.startsWith("@/")
      ? specifier.slice(2)
      : specifier.startsWith(".")
      ? new URL(specifier, new URL(path, root)).href.slice(root.href.length)
      : specifier;
    if (
      inner &&
      (/^(?:app|lib|infrastructure)\//.test(dependency) ||
        /\/adapter\//.test(dependency) ||
        /^(?:hono|@hono|drizzle|mysql2|jsonwebtoken|@felix\/bcrypt|node:|npm:|jsr:)/
          .test(dependency) ||
        /^core\/config\/(?:env|beanConfig|applicationContext|getUseCase|InfrastructureAutowired)/
          .test(dependency))
    ) {
      violations.push(
        `${path}: inner layer imports implementation ${specifier}`,
      );
    }
    if (
      inner?.[2] === "domain" &&
      (/\/application\//.test(dependency) || /^core\/config\//.test(dependency))
    ) {
      violations.push(
        `${path}: domain imports application/config ${specifier}`,
      );
    }
    const outbound = /^core\/([^/]+)\/application\/port\/out\//.exec(
      dependency,
    );
    if (
      inner?.[2] === "application" && outbound && outbound[1] !== inner[1] &&
      outbound[1] !== "common"
    ) {
      violations.push(
        `${path}: cross-domain collaboration must use an in-port: ${specifier}`,
      );
    }
    if (
      path.startsWith("app/") &&
      /^(?:lib\/db\/|core\/.*\/adapter\/|core\/[^/]+\/application\/(?!port\/in\/)|core\/config\/(?:beanConfig|applicationContext))/
        .test(dependency)
    ) {
      violations.push(
        `${path}: API imports an outbound implementation ${specifier}`,
      );
    }
    if (
      path.startsWith("app/") && dependency === "core/config/getUseCase.ts" &&
      ![
        "app/api/config/ApiControllerConfig.ts",
        "app/api/config/ApiRuntimeConfig.ts",
      ].includes(path)
    ) {
      violations.push(
        `${path}: resolve use cases only in API composition modules`,
      );
    }
  }
  if (
    inner?.[2] === "application" && path.endsWith("Service.ts") &&
    !/export\s+class\s+\w+\s+implements\s+[\s\S]*?UseCase\b/.test(source)
  ) {
    violations.push(`${path}: service must implement a use case`);
  }
  return violations;
}

async function scan(directory: string): Promise<string[]> {
  const violations: string[] = [];
  for await (const entry of Deno.readDir(new URL(directory, root))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory) violations.push(...await scan(path));
    else if (entry.name.endsWith(".ts")) {
      violations.push(
        ...checkSource(path, await Deno.readTextFile(new URL(path, root))),
      );
    }
  }
  return violations;
}

if (import.meta.main) {
  const violations = [...await scan("core"), ...await scan("app")];
  if (violations.length) {
    console.error(violations.join("\n"));
    Deno.exit(1);
  }
  console.log("Architecture checks passed");
}
