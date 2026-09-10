import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, isApiEnabled } from "../../../api/client";
import { loadApiWorkspace } from "../../../api/workspace";
import { listEvidence } from "../../../api/evidence";
import { loadEvidenceRecords } from "../../../evidence/EvidenceService";
import { readScopedJson } from "../../../auth/session";
import { useUser } from "../../../auth/UserContext";
import { CMMC_FRAMEWORK_ID } from "../../../core/engines/framework-engine/frameworkRegistry";
import { CMMCPageLayout } from "../components";
import { useCMMCWorkflowState, useCMMCSPRSCalculation } from "../hooks";
import CMMCOperationSummary from "../components/CMMCOperationSummary";
import { useCMMCOperations } from "../hooks/useCMMCOperations";

export default function CMMCReportsPage() {
  const { user } = useUser();
  const operations = useCMMCOperations();
  const workflow = useCMMCWorkflowState();
  const metrics = useCMMCSPRSCalculation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const exportReport = async () => {
    setBusy(true); setError("");
    try {
      const [records, evidence, workspace, sprs, suppliers, training, policies] = isApiEnabled ? await Promise.all([
        apiRequest("/api/v1/cmmc/operations"), listEvidence(CMMC_FRAMEWORK_ID), loadApiWorkspace(CMMC_FRAMEWORK_ID),
        apiRequest(`/api/v1/cmmc/sprs?frameworkId=${CMMC_FRAMEWORK_ID}`), apiRequest("/api/v1/vendors"), apiRequest("/api/v1/training"), apiRequest(`/api/v1/policies?frameworkId=${CMMC_FRAMEWORK_ID}`),
      ]) : [operations.records, loadEvidenceRecords(CMMC_FRAMEWORK_ID), { scopeAnswers: workflow.scopeAnswers, controlWorkflowFields: workflow.controlWorkflowFields, evidenceWorkflowFields: workflow.evidenceWorkflowFields }, metrics, readScopedJson("spectramind:vendors", []), { library: readScopedJson("spectramind:training-library", []), assignments: readScopedJson("spectramind:training-assignments", []) }, { library: readScopedJson(`spectramind:policy-library:${CMMC_FRAMEWORK_ID}`, []) }];
      const report = { format: "compvd-cmmc-workspace-v1", generatedAt: new Date().toISOString(), organization: { id: user.organizationId, name: user.organizationName }, source: isApiEnabled ? "api" : "browser", notice: "Operational records and readiness do not constitute certification. Organization-wide suppliers and training are included for context. This export contains sensitive workspace data; handle according to your organization policy. File contents are not embedded.", operations: records, evidence, workspace, sprs, suppliers, training, policies };
      const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `CMMC-combined-report-${new Date().toISOString().slice(0, 10)}.json`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(`Export not created: ${reason.message}. All report sources must load successfully.`); }
    finally { setBusy(false); }
  };
  return <CMMCPageLayout eyebrow="CMMC reporting" title="Combined workspace report" description="Controls, operational records, evidence metadata, documentation, suppliers, and training in one structured export." actions={<button disabled={busy || operations.loading || Boolean(operations.error)} onClick={exportReport} className="rounded-lg bg-[#071a33] px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "Collecting sources…" : "Export combined JSON"}</button>}>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}</p>}
    <CMMCOperationSummary />
    <section className="rounded-lg border bg-white p-5"><h2 className="font-black">Connected assessment outputs</h2><div className="mt-4 flex flex-wrap gap-3">{[["SPRS score", "/cmmc/sprs-score"], ["SSP and evidence", "/cmmc/ssp"], ["POA&M", "/cmmc/poam"], ["Policies", "/cmmc/policies"], ["Uploaded evidence", "/cmmc/uploaded-evidence"], ["Training", "/training"], ["Suppliers", "/cmmc/suppliers"]].map(([label, to]) => <Link key={label} to={to} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{label}</Link>)}</div><p className="mt-4 text-sm leading-6 text-slate-500">SSP and POA&M PDF exports remain in their existing workflows. Operational links provide context and traceability; readiness changes only through the existing control and evidence validation process.</p></section>
  </CMMCPageLayout>;
}
