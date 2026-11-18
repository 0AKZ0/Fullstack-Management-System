import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import argon2 from "argon2";
import { env } from "../config/env.js";

export default fp(async app => {
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL, iss: "forgeops-api", aud: "forgeops-web" },
    verify: { allowedIss: "forgeops-api", allowedAud: "forgeops-web" }
  });

  app.decorate("authenticate", async (request, reply) => {
    try {
      const payload = await request.jwtVerify<{ sub: string; email: string }>();
      const user = await app.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, isActive: true }
      });
      if (!user?.isActive) {
        return reply.code(401).send({ error: "unauthorized", message: "Invalid or inactive account" });
      }
      request.authUser = { id: user.id, email: user.email };
    } catch {
      return reply.code(401).send({ error: "unauthorized", message: "A valid access token is required" });
    }
  });

  app.decorate("verifyPassword", (hash: string, password: string) => argon2.verify(hash, password));
}, { name: "authentication", dependencies: ["prisma"] });
