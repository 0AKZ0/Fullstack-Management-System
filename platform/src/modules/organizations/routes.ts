import type { FastifyInstance } from "fastify";

export async function organizationRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [app.authenticate],
    schema: {
      tags: ["Organizations"],
      security: [{ bearerAuth: [] }]
    }
  }, async request => {
    const memberships = await app.prisma.membership.findMany({
      where: { userId: request.authUser!.id },
      select: {
        role: true,
        organization: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { organization: { name: "asc" } }
    });

    return memberships.map(({ role, organization }) => ({ ...organization, role }));
  });
}
