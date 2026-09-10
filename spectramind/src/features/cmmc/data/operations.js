export const workflowLabels = {
  calendar: ["Schedule activity", "Activity", "Activity owner", "Scheduled date"],
  changes: ["Request change", "Change request", "Change owner", "Planned implementation date"],
  "access-reviews": ["Add account review", "Review item", "Reviewer", "Campaign deadline"],
  documents: ["Register document", "Document title", "Document custodian", "Next review date"],
  procedures: ["Write procedure", "Procedure title", "Process owner", "Next review date"],
  risks: ["Assess risk", "Risk statement", "Risk owner", "Treatment deadline"],
  incidents: ["Report incident", "Incident summary", "Incident commander", "Response target date"],
  assets: ["Register asset", "Asset name", "Asset custodian", "Next inventory review"],
};

export const riskScore = (details, residual = false) => {
  const likelihood = Number(details[residual ? "residualLikelihood" : "likelihood"]);
  const impact = Number(details[residual ? "residualImpact" : "impact"]);
  return likelihood >= 1 && likelihood <= 5 && impact >= 1 && impact <= 5 ? likelihood * impact : null;
};

export const operationModules = {
  calendar: { title: "Compliance Calendar", description: "Schedule and track recurring compliance work.", statuses: ["Scheduled", "In Progress", "Completed"], fields: [["activity", "Activity / procedure", "text"], ["recurrence", "Repeat", ["None", "Monthly", "Quarterly", "Yearly"]], ["result", "Completion result", "textarea"]] },
  changes: { title: "Change Control", description: "Document requested changes, their impact, approval, and rollback plan.", statuses: ["Draft", "In Review", "Approved", "Implemented", "Rolled Back"], fields: [["system", "Affected system", "text"], ["impact", "Impact assessment", "textarea"], ["rollback", "Rollback plan", "textarea"], ["approval", "Approval reference / decision", "textarea"], ["validation", "Post-change validation", "textarea"]] },
  "access-reviews": { title: "Access Reviews", description: "Record account reviews and track access decisions to closure. Decisions do not provision or revoke access automatically.", statuses: ["Open", "In Review", "Completed"], fields: [["subject", "Account / person reviewed", "text"], ["system", "System and current permissions", "textarea"], ["decision", "Decision", ["Pending", "Retain", "Modify", "Revoke"]], ["rationale", "Decision rationale", "textarea"], ["verification", "Action verification", "textarea"]] },
  procedures: { title: "Procedures", description: "Maintain operating procedures with owners, review dates, and revision history.", statuses: ["Draft", "In Review", "Approved", "Retired"], fields: [["documentVersion", "Document version", "text"], ["purpose", "Purpose and scope", "textarea"], ["steps", "Procedure steps", "textarea"], ["approval", "Review / approval reference", "text"]] },
  documents: { title: "Document Control", description: "Track controlled documents, versions, review decisions, and linked evidence.", statuses: ["Draft", "In Review", "Approved", "Superseded"], fields: [["documentVersion", "Document version", "text"], ["location", "Document location / reference", "text"], ["classification", "Classification", ["Internal", "Confidential", "CUI"]], ["changeSummary", "Revision summary", "textarea"], ["approval", "Approval reference", "text"]] },
  risks: { title: "Risk Register", description: "Assess operational risks and link treatment to controls, incidents, and remediation records.", statuses: ["Open", "Treating", "Accepted", "Closed"], fields: [["scenario", "Risk scenario", "textarea"], ["likelihood", "Likelihood (1 low – 5 high)", ["1", "2", "3", "4", "5"]], ["impact", "Impact (1 low – 5 high)", ["1", "2", "3", "4", "5"]], ["treatment", "Treatment plan", "textarea"], ["decision", "Acceptance / closure rationale", "textarea"]] },
  incidents: { title: "Incidents", description: "Track an incident from detection through recovery and lessons learned.", statuses: ["Detected", "Investigating", "Contained", "Recovering", "Closed"], fields: [["severity", "Severity", ["Low", "Medium", "High", "Critical"]], ["detectedAt", "Detection date", "date"], ["systems", "Affected systems", "textarea"], ["response", "Response actions", "textarea"], ["lessons", "Recovery verification / lessons learned", "textarea"]] },
  assets: { title: "Assets", description: "Maintain the asset inventory and record CUI scope and review ownership.", statuses: ["Active", "Under Review", "Retired"], fields: [["type", "Asset type", ["Device", "Server", "Application", "Cloud service", "Network", "Other"]], ["identifier", "Asset identifier", "text"], ["location", "Location", "text"], ["cui", "CUI scope", ["Not assessed", "In scope", "Out of scope"]], ["boundary", "Boundary / scope justification", "textarea"]] },
};

operationModules.calendar.fields.unshift(["obligation", "Obligation / control reference", "text"]);
operationModules.changes.fields.unshift(["changeType", "Change type", ["Standard", "Normal", "Emergency"]], ["requestedBy", "Requested by", "text"]);
operationModules["access-reviews"].fields.unshift(["campaign", "Review campaign", "text"], ["privilege", "Privilege level", ["Standard", "Privileged", "Service account"]]);
operationModules.documents.fields.push(["effectiveDate", "Effective date", "date"]);
operationModules.procedures.fields.push(["effectiveDate", "Effective date", "date"]);
operationModules.risks.fields.push(["residualLikelihood", "Residual likelihood (after treatment)", ["1", "2", "3", "4", "5"]], ["residualImpact", "Residual impact (after treatment)", ["1", "2", "3", "4", "5"]]);
operationModules.incidents.fields.push(["containment", "Containment actions", "textarea"], ["recovery", "Recovery plan and verification", "textarea"]);
operationModules.assets.fields.push(["service", "Business service / dependency", "text"], ["disposal", "Retirement / disposal verification", "textarea"]);

export function validateOperation(record) {
  const config = operationModules[record.module];
  if (!config || !record.title.trim() || !record.owner.trim()) return "Title and owner are required.";
  if (!config.statuses.includes(record.status)) return "Select a valid status.";
  const d = record.details || {};
  const required = record.module === "calendar" ? ["dueDate"] : [];
  if (required.some(field => !record[field])) return "A due date is required for scheduled work.";
  if (record.status === "Approved" && !d.approval?.trim()) return "Record an approval reference before marking this approved.";
  if (record.module === "changes" && record.status === "Implemented" && (!d.approval?.trim() || !d.validation?.trim())) return "Approval and post-change validation are required.";
  if (record.module === "access-reviews" && record.status === "Completed" && (!d.subject?.trim() || !d.decision || d.decision === "Pending" || !d.verification?.trim())) return "A reviewed account, decision, and verification are required.";
  if (record.module === "incidents" && record.status === "Closed" && !d.lessons?.trim()) return "Document recovery verification and lessons learned before closure.";
  if (record.module === "risks" && ["Closed", "Accepted"].includes(record.status) && !d.decision?.trim()) return "A decision rationale is required.";
  if (record.module === "calendar" && record.status === "Completed" && !d.result?.trim()) return "Record the activity result before completion.";
  if (record.module === "risks" && ["likelihood", "impact", "residualLikelihood", "residualImpact"].some(field => d[field] && !["1", "2", "3", "4", "5"].includes(d[field]))) return "Risk ratings must be whole numbers from 1 to 5.";
  if (["documents", "procedures"].includes(record.module) && record.status === "Approved" && (!d.documentVersion?.trim() || !(record.module === "documents" ? d.location : d.steps)?.trim() || !d.effectiveDate)) return "Approved documents need a version, effective date, and document location or procedure steps.";
  if (record.module === "incidents" && ["Contained", "Recovering", "Closed"].includes(record.status) && !d.containment?.trim()) return "Document containment actions before advancing the incident.";
  if (record.module === "incidents" && record.status === "Closed" && !d.recovery?.trim()) return "Document recovery verification before closing the incident.";
  if (record.module === "assets" && record.status === "Retired" && !d.disposal?.trim()) return "Record retirement or disposal verification.";
  return "";
}

export function nextOccurrence(date, recurrence) {
  const months = { Monthly: 1, Quarterly: 3, Yearly: 12 }[recurrence];
  if (!months || !date) return "";
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + months);
  const last = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  value.setUTCDate(Math.min(day, last));
  return value.toISOString().slice(0, 10);
}
