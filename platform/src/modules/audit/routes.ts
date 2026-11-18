import type { FastifyInstance } from "fastify";
import { canReadAuditLog } from "../../shared/policies.js";

export async function auditRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [app.authenticate, app.resolveTenant],
    schema: {
      tags: ["Audit"],
      security: [{ bearerAuth: [] }],
      headers: {
        type: "object",
        required: ["x-organization-id"],
        properties: { "x-organization-id": { type: "string" } }
      },
      querystring: {
        type: "object",
        properties: {
          cursor: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 30 }
        }
      }
    }
  }, async (request, reply) => {
    const tenant = request.tenant!;
    if (!canReadAuditLog(tenant.role)) {
      return reply.code(403).send({ error: "forbidden", message: "Only organization admins can inspect audit events" });
    }
    const query = request.query as { cursor?: string; limit?: number };
    const limit = query.limit ?? 30;
    const events = await app.prisma.auditEvent.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
    });
    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;
    return { items: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null };
  });
}
