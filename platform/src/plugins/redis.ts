import fp from "fastify-plugin";
import Redis from "ioredis";
import { env } from "../config/env.js";

export default fp(async app => {
  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 1,
    retryStrategy: attempts => Math.min(attempts * 200, 2000)
  });

  redis.on("error", error => app.log.error({ err: error }, "Redis client error"));
  app.decorate("redis", redis);
  app.addHook("onClose", async () => {
    if (redis.status === "ready" || redis.status === "connecting") {
      await redis.quit();
    } else {
      redis.disconnect();
    }
  });
}, { name: "redis" });
