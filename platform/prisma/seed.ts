import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@forgeops.local";
  const passwordHash = await argon2.hash("ChangeMe-Local-Only-2026!", {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "ForgeOps Demo Admin", passwordHash }
  });
  const organization = await prisma.organization.upsert({
    where: { slug: "forgeops-demo" },
    update: {},
    create: { name: "ForgeOps Demo", slug: "forgeops-demo" }
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: { role: "OWNER" },
    create: { userId: user.id, organizationId: organization.id, role: "OWNER" }
  });

  console.info({ email, organizationId: organization.id }, "Local demo identity created");
  console.warn("Demo password is for local development only. Change it before any shared deployment.");
}

main().finally(() => prisma.$disconnect());
