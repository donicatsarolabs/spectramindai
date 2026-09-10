export function validateCMMCSupplierAssessment(input: { status: string; summary?: string; responses?: Record<string, unknown> }) {
  const responses = input.responses;
  if (responses?.framework !== "cmmc-level-2" || input.status !== "COMPLETED") return;
  if (!input.summary?.trim() || typeof responses.service !== "string" || !responses.service.trim()
    || !["Processes CUI", "Stores CUI", "Transmits CUI", "No CUI access"].includes(String(responses.cui))
    || !["Approved", "Conditional", "Rejected"].includes(String(responses.decision))) {
    throw Object.assign(new Error("Completed CMMC supplier assessments require a service, CUI classification, decision, and summary."), { statusCode: 400 });
  }
}
