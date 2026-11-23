import { existsSync } from "node:fs";
import {
  importsIn,
  listSourceFiles,
  relativePath,
  report,
  resolveLocalImport,
} from "./lib/source-files.mjs";

const graph = new Map();
for (const file of listSourceFiles()) {
  const dependencies = new Set();
  for (const name of importsIn(file)) {
    const resolved = resolveLocalImport(file, name)?.find(existsSync);
    if (resolved) dependencies.add(resolved);
  }
  graph.set(file, dependencies);
}

const visited = new Set();
const active = new Set();
const failures = [];

function visit(file, stack) {
  if (active.has(file)) {
    const cycleStart = stack.indexOf(file);
    failures.push(
      `circular import: ${stack.slice(cycleStart).concat(file).map(relativePath).join(" → ")}`,
    );
    return;
  }
  if (visited.has(file)) return;
  active.add(file);
  for (const next of graph.get(file) ?? []) visit(next, [...stack, file]);
  active.delete(file);
  visited.add(file);
}

for (const file of graph.keys()) visit(file, []);
report([...new Set(failures)], "circular dependency audit");
