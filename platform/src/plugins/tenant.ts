import fp from "fastify-plugin";
import { env } from "../config/env.js";

export default fp(async app => {
  app.decorateRequest("tenant", null);
  app.decorateRequest("authUser", null);

  app.decorate("resolveTenant", async (request, reply) => {
    const organizationId = request.headers["x-organization-id"];
    if (typeof organizationId !== "string" || organizationId.length < 5 || organizationId.length > 40) {
      return reply.code(400).send({ error: "tenant_required", message: "Provide a valid x-organization-id header" });
    }
    if (!request.authUser) {
      return reply.code(401).send({ error: "unauthorized", message: "Authentication is required" });
    }

    const membership = await app.prisma.membership.findUnique({
      where: { userId_organizationId: { userId: request.authUser.id, organizationId } },
      select: { organizationId: true, role: true }
    });

    if (!membership) {
      request.log.warn({ userId: request.authUser.id, organizationId }, "Tenant membership denied");
      return reply.code(403).send({ error: "tenant_forbidden", message: "You are not a member of this organization" });
    }

    request.tenant = membership;
  });
}, { name: "tenant-context", dependencies: ["prisma", "authentication"] });
