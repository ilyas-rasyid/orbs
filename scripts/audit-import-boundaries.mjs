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
  const sourceFeature = source.match(/^(frontend|backend)\/src\/features\/([^/]+)\//);
  const sourceShared = /^(frontend|backend)\/src\/shared\//.test(source);

  for (const imported of importsIn(file)) {
    const target = imported.match(/^@\/features\/([^/]+)\/(.*)$/);
    const resolvedTarget = resolveLocalImport(file, imported)?.[0];
    const normalized = resolvedTarget ? relativePath(resolvedTarget) : "";
    const targetFeature = normalized.match(/^(frontend|backend)\/src\/features\/([^/]+)\//);
    const featureName = target?.[1] ?? targetFeature?.[2];
    const isDirectFeatureFile =
      /^(frontend|backend)\/src\/features\/[^/]+\/[^/]+\.(api|select)\.ts$/.test(normalized);
    const publicEntry =
      (target ? target[2] === "index" : /\/index\.ts(x)?$/.test(normalized)) || isDirectFeatureFile;

    if (sourceFeature && featureName && sourceFeature[2] !== featureName && !publicEntry) {
      failures.push(`${source}: cross-feature deep import ${imported}`);
    }
    if (sourceShared && featureName) {
      failures.push(`${source}: shared cannot depend on feature ${imported}`);
    }
    if (sourceFeature && (imported.includes("/routes/") || normalized.includes("/src/routes/"))) {
      failures.push(`${source}: feature cannot depend on route modules ${imported}`);
    }
  }
}

report(failures, "feature import boundaries");
