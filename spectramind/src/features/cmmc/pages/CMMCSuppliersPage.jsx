import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "../../../auth/UserContext";
import { canManageWorkspace, readScopedJson, writeScopedJson } from "../../../auth/session";
import { isApiEnabled } from "../../../api/client";
import { createVendor, listVendors, updateVendor, createVendorAssessment } from "../../../api/assurance";
import { CMMCPageLayout } from "../components";

const KEY = "spectramind:vendors";
const EVENT = "compvd:suppliers-updated";
const emptyVendor = { name: "", category: "", ownerName: "", risk: "LOW", nextReviewDate: "", active: true };
const emptyAssessment = { status: "DRAFT", summary: "", service: "", cui: "Not assessed", assurance: "", findings: "", decision: "Pending" };

export default function CMMCSuppliersPage() {
  const { user } = useUser();
  return <SupplierWorkspace key={user?.organizationId} canEdit={canManageWorkspace(user?.role)} />;
}

function SupplierWorkspace({ canEdit }) {
  const mounted = useRef(false);
  const requestSequence = useRef(0);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [query, setQuery] = useState("");
  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    try { const rows = await (isApiEnabled ? listVendors() : Promise.resolve(readScopedJson(KEY, []))); if (mounted.current && sequence === requestSequence.current) { setSuppliers(rows || []); setError(""); } }
    catch (reason) { if (mounted.current && sequence === requestSequence.current) setError(reason.message); }
    finally { if (mounted.current && sequence === requestSequence.current) setLoading(false); }
  }, []);
  useEffect(() => { mounted.current = true; Promise.resolve().then(refresh); window.addEventListener(EVENT, refresh); window.addEventListener("focus", refresh); window.addEventListener("storage", refresh); return () => { mounted.current = false; window.removeEventListener(EVENT, refresh); window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); }; }, [refresh]);
  const persistLocal = updated => {
    const current = readScopedJson(KEY, []);
    writeScopedJson(KEY, [...current.filter(row => row.id !== updated.id), updated], { eventName: EVENT });
  };
  const saveSupplier = async event => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const input = { name: draft.name.trim(), category: draft.category || "", ownerName: draft.ownerName || "", risk: draft.risk.toUpperCase(), active: draft.active, nextReviewDate: draft.nextReviewDate ? new Date(`${draft.nextReviewDate}T00:00:00Z`).toISOString() : null };
      if (input.name.length < 2) throw new Error("Supplier name must have at least two characters.");
      if (isApiEnabled) { if (draft.id) await updateVendor(draft.id, draft.version, input); else await createVendor(input); }
      else {
        const current = readScopedJson(KEY, []).find(row => row.id === draft.id);
        if (draft.id && (current?.version || 1) !== (draft.version || 1)) throw new Error("Supplier changed. Reopen it before saving.");
        persistLocal({ ...current, ...input, id: draft.id || crypto.randomUUID(), version: (current?.version || 0) + 1, reviewDate: draft.nextReviewDate || "None set" });
      }
      setDraft(null); await refresh(); window.dispatchEvent(new Event(EVENT));
    } catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  };
  const saveAssessment = async event => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (assessment.status === "COMPLETED" && (!assessment.summary.trim() || !assessment.service.trim() || assessment.cui === "Not assessed" || assessment.decision === "Pending")) throw new Error("Complete service, CUI classification, decision, and summary before completing the assessment.");
      const input = { status: assessment.status, summary: assessment.summary, responses: { framework: "cmmc-level-2", service: assessment.service, cui: assessment.cui, assurance: assessment.assurance, findings: assessment.findings, decision: assessment.decision } };
      if (isApiEnabled) await createVendorAssessment(assessment.vendorId, input);
      else {
        const supplier = readScopedJson(KEY, []).find(row => row.id === assessment.vendorId);
        if (!supplier) throw new Error("Supplier no longer exists.");
        persistLocal({ ...supplier, version: (supplier.version || 1) + 1, assessments: [{ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), completedAt: input.status === "COMPLETED" ? new Date().toISOString() : null }, ...(supplier.assessments || [])] });
      }
      setAssessment(null); await refresh(); window.dispatchEvent(new Event(EVENT));
    } catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  };
  const edit = row => { setDraft({ ...row, risk: (row.risk || "LOW").toUpperCase(), active: row.active !== false, nextReviewDate: row.nextReviewDate?.slice(0, 10) || (/^\d{4}-\d{2}-\d{2}$/.test(row.reviewDate || "") ? row.reviewDate : "") }); setAssessment(null); };
  const assess = row => { const previous = row.assessments?.[0]; setAssessment({ ...emptyAssessment, ...previous?.responses, summary: previous?.summary || "", vendorId: row.id, vendorName: row.name, status: "DRAFT" }); setDraft(null); };
  return <CMMCPageLayout eyebrow="Third-party assurance" title="Suppliers & service dependencies" description="Assess the suppliers supporting your CUI environment. Supplier identity and reviews use the existing organization vendor records." actions={canEdit && <button onClick={() => { setDraft({ ...emptyVendor }); setAssessment(null); }} className="rounded-lg bg-[#071a33] px-4 py-2 font-bold text-white">Onboard supplier</button>}>
    {error && <p role="alert" className="rounded bg-rose-50 p-3 text-rose-700">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-3">{[["Active suppliers", suppliers.filter(r => r.active !== false).length], ["High / critical risk", suppliers.filter(r => ["HIGH", "CRITICAL"].includes((r.risk || "").toUpperCase())).length], ["No assessment recorded", suppliers.filter(r => !r.assessments?.length).length]].map(([label, count]) => <div key={label} className="rounded-lg border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{count}</p></div>)}</div>
    {draft && <form onSubmit={saveSupplier} className="space-y-4 rounded-lg border border-emerald-200 bg-white p-5"><h2 className="font-black">{draft.id ? "Supplier profile & review ownership" : "Supplier onboarding"}</h2><fieldset disabled={!canEdit || saving} className="grid gap-4 sm:grid-cols-2"><Input label="Supplier name" value={draft.name} onChange={name => setDraft({ ...draft, name })} required /><Input label="Service category" value={draft.category || ""} onChange={category => setDraft({ ...draft, category })} /><Input label="Internal relationship owner" value={draft.ownerName || ""} onChange={ownerName => setDraft({ ...draft, ownerName })} /><Input label="Next review" type="date" value={draft.nextReviewDate} onChange={nextReviewDate => setDraft({ ...draft, nextReviewDate })} /><Input label="Supplier risk" type={["LOW", "MEDIUM", "HIGH", "CRITICAL"]} value={draft.risk} onChange={risk => setDraft({ ...draft, risk })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={event => setDraft({ ...draft, active: event.target.checked })} />Active supplier relationship</label>{canEdit && <button className="rounded-lg bg-[#071a33] px-4 py-2 text-white">{saving ? "Saving…" : "Save supplier"}</button>}</fieldset><button type="button" onClick={() => setDraft(null)}>Close</button></form>}
    {assessment && <form onSubmit={saveAssessment} className="space-y-4 rounded-lg border border-emerald-200 bg-white p-5"><h2 className="font-black">Service dependency assessment · {assessment.vendorName}</h2><p className="text-xs text-slate-500">Saving creates a new assessment entry. Decisions do not automatically approve contracts or change control readiness.</p><fieldset disabled={saving || !canEdit} className="grid gap-4 sm:grid-cols-2">{[["service", "Service provided / dependency", "textarea"], ["cui", "CUI handling", ["Not assessed", "Processes CUI", "Stores CUI", "Transmits CUI", "No CUI access"]], ["assurance", "Assurance evidence / contract references", "textarea"], ["findings", "Findings and follow-up actions", "textarea"], ["decision", "Onboarding / renewal decision", ["Pending", "Approved", "Conditional", "Rejected"]], ["summary", "Assessment summary", "textarea"], ["status", "Assessment state", ["DRAFT", "IN_REVIEW", "COMPLETED"]]].map(([key, label, type]) => <Input key={key} label={label} type={type} value={assessment[key]} onChange={value => setAssessment({ ...assessment, [key]: value })} />)}<button className="rounded-lg bg-[#071a33] px-4 py-2 text-white">{saving ? "Saving…" : "Save assessment"}</button></fieldset><button type="button" onClick={() => setAssessment(null)}>Cancel</button></form>}
    <section className="rounded-lg border bg-white p-5"><input aria-label="Search suppliers" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search supplier or service…" className="mb-4 rounded border px-3 py-2" />{loading ? <p>Loading suppliers…</p> : <div className="grid gap-4 lg:grid-cols-2">{suppliers.filter(row => `${row.name} ${row.category}`.toLowerCase().includes(query.toLowerCase())).map(row => <article key={row.id} className="rounded-lg border border-slate-200 p-4"><div className="flex justify-between"><button onClick={() => edit(row)} className="text-lg font-black text-[#071a33]">{row.name}</button><span className="text-xs font-bold">{row.risk} risk</span></div><p className="mt-2 text-sm text-slate-500">{row.category || "Uncategorized"} · {row.ownerName || "No owner"}</p><p className="mt-2 text-xs">Review: {row.nextReviewDate?.slice(0, 10) || row.reviewDate || "Not scheduled"} · {row.active === false ? "Inactive" : "Active"}</p><div className="mt-3 rounded bg-slate-50 p-3 text-sm"><p className="font-semibold">Latest assessment: {row.assessments?.[0]?.status || "Not assessed"}</p><p className="mt-1">{row.assessments?.[0]?.summary || "Review service dependency and CUI handling before recording an onboarding decision."}</p>{row.assessments?.[0]?.responses?.decision && <p className="mt-2 text-emerald-700">Decision: {row.assessments[0].responses.decision}</p>}</div><div className="mt-4 flex gap-4"><button onClick={() => edit(row)} className="text-sm font-bold text-emerald-700">Supplier profile</button>{canEdit && <button onClick={() => assess(row)} className="text-sm font-bold text-emerald-700">{row.assessments?.length ? "Reassess supplier" : "Start assessment"}</button>}</div></article>)}</div>}{!loading && !suppliers.length && <p className="py-6 text-center text-slate-500">No suppliers registered yet.</p>}</section>
  </CMMCPageLayout>;
}
function Input({ label, type = "text", value, onChange, required = false }) {
  const props = { value: value || "", required, onChange: event => onChange(event.target.value), className: "mt-2 block w-full rounded border border-slate-200 px-3 py-2 font-normal" };
  return <label className="text-sm font-semibold">{label}{Array.isArray(type) ? <select {...props}>{type.map(value => <option key={value}>{value}</option>)}</select> : type === "textarea" ? <textarea {...props} rows={3} maxLength={5000} /> : <input {...props} type={type} />}</label>;
}
