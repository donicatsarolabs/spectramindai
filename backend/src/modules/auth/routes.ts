import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
  organizationName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(["Admin", "Manager", "User"]).default("Admin"),
});

const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return reply.code(409).send({ code: "EMAIL_EXISTS", message: "Email is already registered" });

    if (input.role === "User" && input.organizationName) {
      return reply.code(403).send({ code: "ROLE_CANNOT_CREATE_ORGANIZATION", message: "User accounts must join an organization through an invitation" });
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    const requestedRole = input.role === "User" ? "EMPLOYEE" : input.role === "Manager" ? "COMPLIANCE_MANAGER" : "ADMIN";

    if (!input.organizationName) {
      const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash, requestedRole } });
      const token = app.jwt.sign({ sub: user.id, email: user.email });
      return reply.code(201).send({ token, user: { id: user.id, name: user.name, email: user.email, requestedRole }, organizations: [] });
    }
    const organizationName = input.organizationName;
    const organizationSlug = await uniqueOrganizationSlug(slugify(organizationName));

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash, requestedRole } });
      const organization = await tx.organization.create({ data: { name: organizationName, slug: organizationSlug } });
      const membership = await tx.organizationMembership.create({
        data: { userId: user.id, organizationId: organization.id, role: input.role === "Manager" ? "COMPLIANCE_MANAGER" : "OWNER" },
      });
      await tx.activityEvent.create({
        data: { organizationId: organization.id, actorUserId: user.id, action: "organization.created", entityType: "organization", entityId: organization.id },
      });
      return { user, organization, membership };
    });

    const token = app.jwt.sign({ sub: result.user.id, email: result.user.email });
    return reply.code(201).send(sessionResponse(result, token));
  });

  app.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { memberships: { include: { organization: true } } },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return reply.code(401).send({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
    }
    const token = app.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, name: user.name, email: user.email, requestedRole: user.requestedRole }, organizations: user.memberships.map(membershipView) };
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { memberships: { include: { organization: true } } },
    });
    if (!user) return reply.code(404).send({ code: "USER_NOT_FOUND", message: "User not found" });
    return { user: { id: user.id, name: user.name, email: user.email, requestedRole: user.requestedRole }, organizations: user.memberships.map(membershipView) };
  });
}

function sessionResponse(result: any, token: string) {
  return { token, user: { id: result.user.id, name: result.user.name, email: result.user.email }, organizations: [membershipView({ ...result.membership, organization: result.organization })] };
}

function membershipView(membership: any) {
  return { id: membership.organization.id, name: membership.organization.name, slug: membership.organization.slug, role: membership.role };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "organization";
}

async function uniqueOrganizationSlug(base: string) {
  let slug = base;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${++suffix}`;
  return slug;
}
