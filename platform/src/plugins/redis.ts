import fp from "fastify-plugin";
import RedisModule from "ioredis";
import { env } from "../config/env.js";

const Redis = RedisModule.default;

export default fp(async app => {
  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempts: number) => Math.min(attempts * 200, 2000)
  });

  redis.on("error", (error: Error) => {
    app.log.error({ err: error }, "Redis client error");
  });
  app.decorate("redis", redis);
  app.addHook("onClose", async () => {
    if (redis.status === "ready" || redis.status === "connecting") {
      await redis.quit();
    } else {
      redis.disconnect();
    }
  });
}, { name: "redis" });
