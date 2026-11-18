import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.fatal({ err: error instanceof Error ? error : new Error(String(error)) }, "API startup failed");
  await app.close();
  process.exit(1);
}

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Graceful shutdown started");
  await app.close();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
