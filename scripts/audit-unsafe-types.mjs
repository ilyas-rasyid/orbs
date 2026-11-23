import ts from "typescript";
import { createSource, listSourceFiles, relativePath, report } from "./lib/source-files.mjs";

const failures = [];
for (const file of listSourceFiles()) {
  if (!/\.tsx?$/.test(file) || file.endsWith(".gen.ts")) continue;
  const source = createSource(file);
  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const location = source.getLineAndCharacterOfPosition(node.getStart(source));
      failures.push(`${relativePath(file)}:${location.line + 1} uses explicit any`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
report(failures, "explicit any audit");
