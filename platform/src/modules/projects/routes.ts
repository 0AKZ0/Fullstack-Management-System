import type { ProjectStatus } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import {
  canCreateProject, canTransitionProjectStatus, canUpdateProject
} from "../../shared/policies.js";

const statuses: ProjectStatus[] = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];

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
    if (name.length < 2) {
      return reply.code(400).send({ error: "invalid_name", message: "Project name is too short" });
    }

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

  app.patch<{ Params: { projectId: string }; Body: { status: ProjectStatus } }>("/:projectId/status", {
    preHandler: [app.authenticate, app.resolveTenant],
    schema: {
      tags: ["Projects"],
      security: [{ bearerAuth: [] }],
      headers: {
        type: "object",
        required: ["x-organization-id"],
        properties: { "x-organization-id": { type: "string" } }
      },
      params: {
        type: "object",
        additionalProperties: false,
        required: ["projectId"],
        properties: { projectId: { type: "string", minLength: 10, maxLength: 32 } }
      },
      body: {
        type: "object",
        additionalProperties: false,
        required: ["status"],
        properties: { status: { type: "string", enum: statuses } }
      }
    }
  }, async (request, reply) => {
    const tenant = request.tenant!;
    if (!canUpdateProject(tenant.role)) {
      return reply.code(403).send({ error: "forbidden", message: "Your role cannot update projects" });
    }

    const current = await app.prisma.project.findFirst({
      where: { id: request.params.projectId, organizationId: tenant.organizationId }
    });
    if (!current) {
      return reply.code(404).send({ error: "not_found", message: "Project not found" });
    }

    const next = request.body.status;
    if (!canTransitionProjectStatus(current.status, next)) {
      return reply.code(409).send({
        error: "invalid_transition",
        message: `A project cannot move from ${current.status} to ${next}`
      });
    }

    const updated = await app.prisma.$transaction(async tx => {
      const result = await tx.project.updateMany({
        where: {
          id: current.id,
          organizationId: tenant.organizationId,
          status: current.status
        },
        data: { status: next }
      });
      if (result.count !== 1) return null;

      const project = await tx.project.findFirst({
        where: { id: current.id, organizationId: tenant.organizationId }
      });
      if (!project) return null;

      await tx.auditEvent.create({
        data: {
          organizationId: tenant.organizationId,
          actorId: request.authUser!.id,
          action: "project.status_changed",
          resourceType: "project",
          resourceId: project.id,
          metadata: { from: current.status, to: next }
        }
      });
      return project;
    });

    if (!updated) {
      return reply.code(409).send({
        error: "concurrent_update",
        message: "The project changed while this request was being processed. Refresh and retry."
      });
    }
    return updated;
  });
}
