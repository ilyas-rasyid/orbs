function assertRelativePath(value: string): string {
  if (!/^\/[\w/-]*$/.test(value) || value.includes("//")) {
    throw new Error("VITE_API_BASE_PATH must be a safe relative path starting with '/'.");
  }
  return value.replace(/\/$/, "") || "/";
}

export const frontendEnv = {
  apiBasePath: assertRelativePath(import.meta.env.VITE_API_BASE_PATH ?? "/api/v1"),
} as const;
