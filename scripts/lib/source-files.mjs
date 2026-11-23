import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

export const root = resolve(import.meta.dirname, "../..");
export const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const excludedDirectories = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "test-results",
  ".tmp",
  "generated",
]);

export function listSourceFiles(directory = root) {
  const results = [];

  function visit(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name)) visit(join(current, entry.name));
        continue;
      }
      if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
        results.push(join(current, entry.name));
      }
    }
  }

  visit(directory);
  return results.sort();
}

export function relativePath(file) {
  return relative(root, file).split(sep).join("/");
}

export function isGenerated(file) {
  return relativePath(file) === "frontend/src/router/routeTree.gen.ts";
}

export function createSource(file, contents = readFileSync(file, "utf8")) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, kind);
}

export function importsIn(file, contents) {
  const syntax = createSource(file, contents);
  const result = [];

  function pushSpecifier(node) {
    if (node && ts.isStringLiteralLike(node)) result.push(node.text);
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      pushSpecifier(node.moduleSpecifier);
    }
    if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const expression = node.expression;
      if (expression.kind === ts.SyntaxKind.ImportKeyword) {
        pushSpecifier(node.arguments[0]);
      }
      if (ts.isIdentifier(expression) && expression.text === "require") {
        pushSpecifier(node.arguments[0]);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(syntax);
  return result;
}

export function resolveLocalImport(from, specifier) {
  const base = specifier.startsWith("@/")
    ? join(
        root,
        from.includes(`${sep}frontend${sep}`) ? "frontend/src" : "backend/src",
        specifier.slice(2),
      )
    : specifier.startsWith(".")
      ? resolve(from, "..", specifier)
      : null;

  if (!base) return null;
  const noExt = base.replace(/\.(js|mjs|ts|tsx)$/, "");
  return [".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"].map(
    (extension) => `${noExt}${extension}`,
  );
}

export function report(failures, successLabel) {
  if (failures.length > 0) {
    for (const issue of failures) console.error(`ERROR ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK ${successLabel}`);
}
