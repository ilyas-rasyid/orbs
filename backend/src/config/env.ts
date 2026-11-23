import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "postgres:" || protocol === "postgresql:";
    }, "DATABASE_URL must be a PostgreSQL URL"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
});

export type BackendEnvironment = {
  mode: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  logLevel: "debug" | "info" | "warn" | "error";
};

export function loadEnvironment(input: NodeJS.ProcessEnv = process.env): BackendEnvironment {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const names = parsed.error.issues.map((item) => item.path.join(".")).join(", ");
    throw new Error(`Invalid backend environment: ${names}`);
  }

  return {
    mode: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    logLevel: parsed.data.LOG_LEVEL,
  };
}
