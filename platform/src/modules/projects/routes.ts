import type { FastifyInstance } from "fastify";
import { canCreateProject, canTransitionProjectStatus, canUpdateProject } from "../../shared/policies.js";

export async function projectRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [app.authenticate, app.resolveTenant],
    schema: {
      tags: ["Projects"],
      security: [{ bearerAuth: [] }],
      headers: {
        type: "object",
        required: ["x-organization-id"],
        properties: { "x-organization-id": { type: "string" } }
      }
    }
  }, async request => {
    const tenant = request.tenant!;
    return app.prisma.project.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 100
    });
  });

  app.post<{ Body: { name: string; description?: string } }>("/", {
    preHandler: [app.authenticate, app.resolveTenant],
    schema: {
      tags: ["Projects"],
      security: [{ bearerAuth: [] }],
      headers: {
        type: "object",
        required: ["x-organization-id"],
        properties: { "x-organization-id": { type: "string" } }
      },
      body: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 120 },
          description: { type: "string", maxLength: 2000 }
        }
      }
    }
  }, async (request, reply) => {
    const tenant = request.tenant!;
    if (!canCreateProject(tenant.role)) {
      return reply.code(403).send({ error: "forbidden", message: "Your role cannot create projects" });
    }
    const name = request.body.name.trim();
    if (name.length < 2) return reply.code(400).send({ error: "invalid_name", message: "Project name is too short" });

    const project = await app.prisma.$transaction(async tx => {
      const created = await tx.project.create({
        data: {
          organizationId: tenant.organizationId,
          name,
          description: request.body.description?.trim() || null
        }
      });
      await tx.auditEvent.create({
        data: {
          organizationId: tenant.organizationId,
          actorId: request.authUser!.id,
          action: "project.created",
          resourceType: "project",
          resourceId: created.id,
          metadata: { name: created.name }
        }
      });
      return created;
    });

    return reply.code(201).send(project);
  });
}
