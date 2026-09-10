import { describe, expect, it } from "vitest";
import { operationSchema } from "../src/modules/cmmc/operations.js";

const base = { module: "calendar", title: "Quarterly review", owner: "Security team", status: "Scheduled", dueDate: "2026-09-30", controlIds: [], relatedIds: [], evidenceIds: [], details: {}, archived: false };
describe("CMMC operational record validation", () => {
  it("accepts scheduled work", () => expect(operationSchema.safeParse(base).success).toBe(true));
  it("requires a calendar due date", () => expect(operationSchema.safeParse({ ...base, dueDate: "" }).success).toBe(false));
  it("rejects invalid calendar dates", () => expect(operationSchema.safeParse({ ...base, dueDate: "2026-02-31" }).success).toBe(false));
  it("requires a completion result", () => expect(operationSchema.safeParse({ ...base, status: "Completed" }).success).toBe(false));
  it("requires change approval and validation", () => {
    expect(operationSchema.safeParse({ ...base, module: "changes", status: "Implemented" }).success).toBe(false);
    expect(operationSchema.safeParse({ ...base, module: "changes", status: "Implemented", details: { approval: "CAB-12", validation: "Smoke tests passed" } }).success).toBe(true);
  });
  it("requires a verified access decision", () => expect(operationSchema.safeParse({ ...base, module: "access-reviews", status: "Completed", details: { subject: "user@example.com", decision: "Pending" } }).success).toBe(false));
  it("requires risk acceptance rationale", () => expect(operationSchema.safeParse({ ...base, module: "risks", status: "Accepted" }).success).toBe(false));
  it("rejects out-of-range risk ratings", () => expect(operationSchema.safeParse({ ...base, module: "risks", status: "Open", details: { impact: "6" } }).success).toBe(false));
  it("requires incident closure verification", () => expect(operationSchema.safeParse({ ...base, module: "incidents", status: "Closed" }).success).toBe(false));
  it("rejects statuses belonging to another module", () => expect(operationSchema.safeParse({ ...base, module: "assets", status: "Approved" }).success).toBe(false));
});
