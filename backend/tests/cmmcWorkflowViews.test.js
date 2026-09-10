import { describe, it, expect } from "vitest";
import { nextOccurrence, riskScore, validateOperation, workflowLabels, operationModules } from "../../spectramind/src/features/cmmc/data/operations.js";
import { validateCMMCSupplierAssessment } from "../src/modules/assurance/supplierValidation.js";

describe("Distinct CMMC workflows", () => {
  it("gives every operational module a purpose-specific action", () => {
    expect(Object.keys(workflowLabels).sort()).toEqual(Object.keys(operationModules).sort());
    expect(new Set(Object.values(workflowLabels).map(labels => labels[0])).size).toBe(8);
  });
  it("advances recurrence safely across short months", () => {
    expect(nextOccurrence("2026-01-31", "Monthly")).toBe("2026-02-28");
    expect(nextOccurrence("2024-02-29", "Yearly")).toBe("2025-02-28");
    expect(nextOccurrence("2026-12-31", "Quarterly")).toBe("2027-03-31");
  });
  it("keeps unassessed risk distinct from low risk and calculates residual risk separately", () => {
    expect(riskScore({})).toBeNull();
    expect(riskScore({ likelihood: "5", impact: "4", residualLikelihood: "2", residualImpact: "2" })).toBe(20);
    expect(riskScore({ likelihood: "5", impact: "4", residualLikelihood: "2", residualImpact: "2" }, true)).toBe(4);
  });
  it("requires document-specific approval metadata", () => {
    const record = { module: "documents", title: "Access policy", owner: "Security", status: "Approved", details: { approval: "Approved by owner" } };
    expect(validateOperation(record)).not.toBe("");
    expect(validateOperation({ ...record, details: { ...record.details, documentVersion: "2.0", effectiveDate: "2026-09-04", location: "Controlled repository" } })).toBe("");
  });
  it("requires response actions before closing an incident", () => {
    const record = { module: "incidents", title: "Incident", owner: "Responder", status: "Closed", details: { lessons: "Reviewed" } };
    expect(validateOperation(record)).not.toBe("");
    expect(validateOperation({ ...record, details: { ...record.details, containment: "Isolated", recovery: "Restored and tested" } })).toBe("");
  });
  it("allows draft supplier assessments but requires completed findings", () => {
    expect(() => validateCMMCSupplierAssessment({ status: "DRAFT", responses: { framework: "cmmc-level-2" } })).not.toThrow();
    expect(() => validateCMMCSupplierAssessment({ status: "COMPLETED", responses: { framework: "cmmc-level-2" } })).toThrow();
    expect(() => validateCMMCSupplierAssessment({ status: "COMPLETED", summary: "Reviewed", responses: { framework: "cmmc-level-2", service: "Hosting", cui: "Stores CUI", decision: "Conditional" } })).not.toThrow();
  });
});
