import { readFileSync } from "node:fs";
import { isGenerated, listSourceFiles, relativePath, report } from "./lib/source-files.mjs";

const failures = [];
let checked = 0;
for (const file of listSourceFiles()) {
  if (isGenerated(file)) continue;
  checked += 1;
  const lines = readFileSync(file, "utf8").split(/\r?\n/).length;
  if (lines > 500) failures.push(`${relativePath(file)}: ${lines} lines (max 500)`);
}
report(failures, `file-length audit (${checked} handwritten source files, ≤500 lines)`);
