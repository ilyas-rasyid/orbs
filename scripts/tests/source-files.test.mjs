import test from "node:test";
import assert from "node:assert/strict";
import { importsIn, listSourceFiles, isGenerated, relativePath } from "../lib/source-files.mjs";

test("AST import extractor recognizes static, dynamic and re-export imports", () => {
  const body = [
    'import { x } from "@/features/booking/service";',
    'export { y } from "../shared/any";',
    'const z = import("./runtime");',
  ].join("\n");
  const names = importsIn("sample.ts", body);
  assert.deepEqual(names, ["@/features/booking/service", "../shared/any", "./runtime"]);
});

test("generated route tree has a single explicit exemption", () => {
  const generated = listSourceFiles().filter(isGenerated);
  assert.ok(generated.length <= 1);
  for (const file of generated) {
    assert.equal(relativePath(file), "frontend/src/router/routeTree.gen.ts");
  }
});

test("source files exist in both separated workspaces", () => {
  const all = listSourceFiles().map(relativePath);
  assert.ok(all.some((value) => value.startsWith("frontend/src/")));
  assert.ok(all.some((value) => value.startsWith("backend/src/")));
});
