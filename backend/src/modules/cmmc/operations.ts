import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireTenant } from "../../plugins/auth.js";

const frameworkId = "cmmc-level-2";
const prefix = "cmmc-operation:";
export const operationSchema = z.object({
  module: z.enum(["calendar", "changes", "access-reviews", "procedures", "documents", "risks", "incidents", "assets"]),
  title: z.string().trim().min(1).max(300),
  owner: z.string().trim().min(1).max(200),
  status: z.string().min(1).max(50),
  dueDate: z.union([z.literal(""), z.iso.date()]),
  controlIds: z.array(z.string().max(100)).max(110),
  relatedIds: z.array(z.string().uuid()).max(100),
  evidenceIds: z.array(z.string().max(200)).max(100),
  details: z.record(z.string().max(100), z.string().max(20000)).refine(value => Object.keys(value).length <= 30),
  archived: z.boolean().default(false),
}).superRefine((record, ctx) => {
  const statuses: Record<string, string[]> = {
    calendar: ["Scheduled", "In Progress", "Completed"], changes: ["Draft", "In Review", "Approved", "Implemented", "Rolled Back"],
    "access-reviews": ["Open", "In Review", "Completed"], procedures: ["Draft", "In Review", "Approved", "Retired"],
    documents: ["Draft", "In Review", "Approved", "Superseded"], risks: ["Open", "Treating", "Accepted", "Closed"],
    incidents: ["Detected", "Investigating", "Contained", "Recovering", "Closed"], assets: ["Active", "Under Review", "Retired"],
  };
  const invalid = (message: string) => ctx.addIssue({ code: "custom", message });
  const has = (field: string) => Boolean(record.details[field]?.trim());
  if (!statuses[record.module]?.includes(record.status)) invalid("Invalid module status.");
  if (record.module === "calendar" && !record.dueDate) invalid("A calendar due date is required.");
  if (record.status === "Approved" && !has("approval")) invalid("An approval reference is required.");
  if (record.module === "changes" && record.status === "Implemented" && (!has("approval") || !has("validation"))) invalid("Approval and validation are required.");
  if (record.module === "calendar" && record.status === "Completed" && !has("result")) invalid("An activity result is required.");
  if (record.module === "access-reviews" && record.status === "Completed" && (!has("subject") || !["Retain", "Modify", "Revoke"].includes(record.details.decision || "") || !has("verification"))) invalid("Account, decision, and verification are required.");
  if (record.module === "incidents" && record.status === "Closed" && !has("lessons")) invalid("Recovery verification is required.");
  if (record.module === "risks" && ["Closed", "Accepted"].includes(record.status) && !has("decision")) invalid("A risk decision rationale is required.");
  if (record.module === "risks" && ["likelihood", "impact", "residualLikelihood", "residualImpact"].some(field => record.details[field] && !["1", "2", "3", "4", "5"].includes(record.details[field]))) invalid("Risk ratings must be 1–5.");
  if (["documents", "procedures"].includes(record.module) && record.status === "Approved" && (!has("documentVersion") || !has("effectiveDate") || !has(record.module === "documents" ? "location" : "steps"))) invalid("Approved documents need a version, effective date, and location or procedure steps.");
  if (record.details.effectiveDate && !z.iso.date().safeParse(record.details.effectiveDate).success) invalid("Invalid effective date.");
  if (record.module === "incidents" && ["Contained", "Recovering", "Closed"].includes(record.status) && !has("containment")) invalid("Containment actions are required.");
  if (record.module === "incidents" && record.status === "Closed" && !has("recovery")) invalid("Recovery verification is required.");
  if (record.module === "assets" && record.status === "Retired" && !has("disposal")) invalid("Retirement verification is required.");
});

export async function cmmcOperationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireTenant);
  app.get("/cmmc/operations", async request => {
    const rows = await prisma.workspaceItemState.findMany({ where: { organizationId: request.tenant.organizationId, frameworkId, itemId: { startsWith: prefix } } });
    return rows.map(row => ({ ...(row.state as object), id: row.itemId.slice(prefix.length), version: row.version }));
  });
  app.put("/cmmc/operations/:id", async (request, reply) => {
    if (!["OWNER", "ADMIN", "COMPLIANCE_MANAGER"].includes(request.tenant.role)) return reply.code(403).send({ message: "Only workspace managers can change operational records." });
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { record, version } = z.object({ record: operationSchema, version: z.number().int().nonnegative() }).parse(request.body);
    const organizationId = request.tenant.organizationId;
    const selected = await prisma.organizationFramework.findFirst({ where: { organizationId, frameworkId, active: true } });
    if (!selected) return reply.code(403).send({ message: "Select CMMC before editing its operational records." });
    if (record.controlIds.length) {
      const controls = await prisma.control.findMany({ where: { frameworkId, externalId: { in: record.controlIds } }, select: { externalId: true } });
      if (new Set(controls.map(control => control.externalId)).size !== new Set(record.controlIds).size) return reply.code(400).send({ message: "Invalid CMMC control link." });
    }
    if (record.relatedIds.length) {
      const related = await prisma.workspaceItemState.count({ where: { organizationId, frameworkId, itemId: { in: record.relatedIds.map(value => prefix + value) } } });
      if (related !== new Set(record.relatedIds).size || record.relatedIds.includes(id)) return reply.code(400).send({ message: "Invalid related record link." });
    }
    if (record.evidenceIds.length) {
      const evidence = await prisma.evidenceRecord.count({ where: { organizationId, frameworkId, id: { in: record.evidenceIds } } });
      if (evidence !== new Set(record.evidenceIds).size) return reply.code(400).send({ message: "Invalid evidence link." });
    }
    return prisma.$transaction(async tx => {
      const where = { organizationId, frameworkId, itemId: prefix + id };
      const current = await tx.workspaceItemState.findFirst({ where });
      if ((current?.version || 0) !== version) throw Object.assign(new Error("Record changed in another session. Reload and review before saving."), { statusCode: 409 });
      const previous = current?.state as Record<string, unknown> | undefined;
      if (previous && previous.module !== record.module) throw Object.assign(new Error("Record type cannot be changed."), { statusCode: 400 });
      const history = Array.isArray(previous?.history) ? previous.history : [];
      const now = new Date().toISOString();
      const state = { ...record, createdAt: previous?.createdAt || now, updatedAt: now, history: [...history, { at: now, actor: request.tenant.userId, revision: version + 1, record }] } as Prisma.InputJsonValue;
      if (current) {
        const result = await tx.workspaceItemState.updateMany({ where: { ...where, version }, data: { state, version: { increment: 1 }, updatedBy: request.tenant.userId } });
        if (result.count !== 1) throw Object.assign(new Error("Record changed in another session."), { statusCode: 409 });
      } else {
        await tx.workspaceItemState.create({ data: { ...where, itemType: "cmmc_operation", state, createdBy: request.tenant.userId, updatedBy: request.tenant.userId } });
      }
      await tx.activityEvent.create({ data: { organizationId, actorUserId: request.tenant.userId, action: "cmmc.operation.saved", entityType: record.module, entityId: id } });
      return { ...(state as object), id, version: version + 1 };
    });
  });
}
