import {
  importsIn,
  listSourceFiles,
  relativePath,
  report,
  resolveLocalImport,
} from "./lib/source-files.mjs";

const failures = [];

for (const file of listSourceFiles()) {
  const source = relativePath(file);
  const frontend = source.startsWith("frontend/");
  const backend = source.startsWith("backend/");
  if (!frontend && !backend) continue;
  const frontendTooling = frontend && !source.startsWith("frontend/src/");

  for (const value of importsIn(file)) {
    const target = resolveLocalImport(file, value)?.[0];
    const normalized = target ? relativePath(target) : "";
    const importsOtherWorkspace = frontend
      ? /(^|\/)backend\//.test(value) ||
        /^@orbs\/backend(?:\/|$)/.test(value) ||
        normalized.startsWith("backend/") ||
        /^(?:@prisma\/|prisma$|elysia$|pg$|bun:)/.test(value) ||
        (!frontendTooling && value.startsWith("node:"))
      : /(^|\/)frontend\//.test(value) ||
        /^@orbs\/frontend(?:\/|$)/.test(value) ||
        normalized.startsWith("frontend/") ||
        /^(react|react-dom|@tanstack\/react-|@vitejs\/)/.test(value);

    if (importsOtherWorkspace) {
      failures.push(`${source}: forbidden workspace dependency ${value}`);
    }
  }
}

report(failures, "frontend/backend workspace isolation");
