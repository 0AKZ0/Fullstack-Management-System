import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import authPlugin from "./plugins/auth.js";
import tenantPlugin from "./plugins/tenant.js";
import { authRoutes } from "./modules/auth/routes.js";
import { organizationRoutes } from "./modules/organizations/routes.js";
import { projectRoutes } from "./modules/projects/routes.js";
import { auditRoutes } from "./modules/audit/routes.js";
import { env } from "./config/env.js";

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    bodyLimit: 32 * 1024,
    trustProxy: env.TRUST_PROXY_HOPS || false
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map(value => value.trim()),
    credentials: false
  });
  await app.register(helmet);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    redis: app.redis
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "ForgeOps API", description: "Multi-tenant operations platform", version: "0.1.0" },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
        }
      }
    }
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  await app.register(authPlugin);
  await app.register(tenantPlugin);

  app.get("/health/live", { schema: { tags: ["Health"] } }, async () => ({ status: "alive" }));
  app.get("/health/ready", { schema: { tags: ["Health"] } }, async (_request, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      await app.redis.ping();
      return { status: "ready", dependencies: { postgres: "up", redis: "up" } };
    } catch (error) {
      app.log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Readiness check failed");
      return reply.code(503).send({ status: "not_ready", dependencies: { postgres: "unknown", redis: "unknown" } });
    }
  });

  await app.register(async api => {
    await api.register(authRoutes, { prefix: "/auth" });
    await api.register(organizationRoutes, { prefix: "/organizations" });
    await api.register(projectRoutes, { prefix: "/projects" });
    await api.register(auditRoutes, { prefix: "/audit-events" });
  }, { prefix: "/v1" });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    if (error.validation) {
      return reply.code(400).send({ error: "validation_error", message: "Request does not match the API contract" });
    }
    return reply.code(500).send({ error: "internal_error", message: "An unexpected error occurred" });
  });

  return app;
}
