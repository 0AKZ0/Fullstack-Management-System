import type { PrismaClient, MembershipRole } from "@prisma/client";
import type Redis from "ioredis";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    resolveTenant: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyPassword: (hash: string, password: string) => Promise<boolean>;
  }

  interface FastifyRequest {
    tenant: { organizationId: string; role: MembershipRole } | null;
    authUser: { id: string; email: string } | null;
  }
}
