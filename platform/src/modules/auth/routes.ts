import type { FastifyInstance } from "fastify";

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { email: string; password: string } }>("/login", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    schema: {
      tags: ["Identity"],
      body: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", minLength: 1, maxLength: 128 }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            tokenType: { type: "string" },
            expiresIn: { type: "string" },
            user: {
              type: "object",
              properties: { id: { type: "string" }, email: { type: "string" }, name: { type: "string" } },
              required: ["id", "email", "name"]
            }
          },
          required: ["accessToken", "tokenType", "expiresIn", "user"]
        }
      }
    }
  }, async (request, reply) => {
    const email = request.body.email.trim().toLowerCase();
    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user?.isActive || !(await app.verifyPassword(user.passwordHash, request.body.password))) {
      return reply.code(401).send({ error: "invalid_credentials", message: "Email or password is incorrect" });
    }

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email });
    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: "15m",
      user: { id: user.id, email: user.email, name: user.name }
    };
  });
}
