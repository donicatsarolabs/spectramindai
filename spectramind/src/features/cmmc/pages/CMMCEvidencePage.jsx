import { FileText, Pin, Printer, ScrollText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  CMMC_FRAMEWORK_ID,
  getFrameworkLibrary,
} from "../../../core/engines/framework-engine/frameworkRegistry";
import { CMMCImplementationLayout, useCMMCWorkspaceFilters } from "../components";
import { useCMMCWorkflowState } from "../hooks";
import {
  CMMC_ACTIVITY_TYPES,
  buildCMMCPolicyDocumentMetrics,
  buildCMMCPolicyDocumentRows,
  exportCMMCPOAMToPDF,
  exportCMMCSSPToPDF,
} from "../services";

const tabs = [
  { id: "ssp", label: "System Security Plan", icon: FileText },
  { id: "poam", label: "POA&M", icon: Pin },
  { id: "policies", label: "Policy Documents", icon: ScrollText },
];

const cmmcLibrary = getFrameworkLibrary(CMMC_FRAMEWORK_ID) || emptyFrameworkLibrary();
const evidenceRows = buildEvidenceRows(cmmcLibrary);
const attachmentAccept = ".pdf,.docx,.xlsx,.png,.jpg,.jpeg";
const supportedAttachmentTypes = new Set(["PDF", "DOCX", "XLSX", "PNG", "JPG", "JPEG"]);

const initialSspForm = {
  owner: "",
  version: "",
  date: "",
  currentSprs: "",
  purpose: "",
};

const sspWorkflowAnswerIds = {
  organizationName: "organizationName",
  systemName: "systemName",
  scope: "systemBoundaryScope",
  environment: "systemEnvironmentDescription",
};

const poamWorkflowFields = {
  weakness: "notesGaps",
  owner: "ownerCollector",
  date: "dateCollected",
  resources: "sourceSystemTool",
  status: "evidenceStatus",
};

const initialPoamMilestones = evidenceRows.reduce((milestones, row) => {
  milestones[row.key] = row.evidence;
  return milestones;
}, {});

export default function CMMCEvidencePage() {
  const { searchQuery, domainFilter, resetVersion, statusFilter } = useCMMCWorkspaceFilters();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const selectedPolicyKey = searchParams.get("item") || searchParams.get("itemId") || "";
  return (
    <CMMCImplementationLayout>
      <CMMCEvidenceContent
        key={`${resetVersion}:${requestedTab || ""}:${selectedPolicyKey}`}
        searchQuery={searchQuery}
        domainFilter={domainFilter}
        statusFilter={statusFilter}
        requestedTab={requestedTab}
        selectedPolicyKey={selectedPolicyKey}
      />
    </CMMCImplementationLayout>
  );
}

function CMMCEvidenceContent({ searchQuery, domainFilter, statusFilter, requestedTab, selectedPolicyKey }) {
  const {
    scopeAnswers,
    organizationProfile,
    controlWorkflowFields,
    evidenceWorkflowFields,
    updateScopeAnswer,
    updateControlAttachments,
    updateControlWorkflowStatus,
    updateEvidenceWorkflowField,
  } = useCMMCWorkflowState();
  const [activeTab, setActiveTab] = useState(() =>
    tabs.some((tab) => tab.id === requestedTab) ? requestedTab : "ssp"
  );
  const [sspForm, setSspForm] = useState(initialSspForm);
  const [poamMilestones, setPoamMilestones] = useState(initialPoamMilestones);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const workflowSspForm = useMemo(
    () => buildWorkflowSspForm(organizationProfile, scopeAnswers),
    [organizationProfile, scopeAnswers]
  );
  const sspFormValues = useMemo(
    () => ({ ...sspForm, ...workflowSspForm }),
    [sspForm, workflowSspForm]
  );
  const workflowEvidenceRows = useMemo(
    () =>
      evidenceRows.map((row) =>
        applyEvidenceWorkflowFields(row, evidenceWorkflowFields[row.key], controlWorkflowFields[row.controlId])
      ),
    [controlWorkflowFields, evidenceWorkflowFields]
  );
  const policyDocumentRows = useMemo(
    () =>
      buildCMMCPolicyDocumentRows({
        controlWorkflowFields,
        evidenceWorkflowFields,
        frameworkLibrary: cmmcLibrary,
      }),
    [controlWorkflowFields, evidenceWorkflowFields]
  );
  const evidenceMetrics = useMemo(
    () => buildEvidenceMetrics(workflowEvidenceRows),
    [workflowEvidenceRows]
  );
  const policyMetrics = useMemo(
    () => buildCMMCPolicyDocumentMetrics(policyDocumentRows),
    [policyDocumentRows]
  );
  const poamNotes = useMemo(
    () => buildPoamNotes(workflowEvidenceRows, poamMilestones),
    [poamMilestones, workflowEvidenceRows]
  );

  const visiblePolicies = useMemo(
    () =>
      policyDocumentRows.filter((row) => {
        const matchesDomain = domainFilter === "all" || domainFilter === row.domain;
        const matchesSearch =
          !normalizedSearch ||
          [
            row.section,
            row.domain,
            row.family,
            row.controlId,
            row.requirement,
            row.evidence,
            row.publicNotesUse,
            row.evidenceStatus,
            row.ownerCollector,
            row.dateCollected,
            row.sourceSystemTool,
            row.notesGaps,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

        return matchesDomain && matchesSearch;
      }),
    [domainFilter, normalizedSearch, policyDocumentRows]
  );

  const visiblePoamRows = useMemo(
    () =>
      workflowEvidenceRows.filter((row) => {
        const rowStatus = row.evidenceStatus;
        const matchesDomain = domainFilter === "all" || domainFilter === row.domain;
        const matchesStatus = statusFilter === "All" || statusFilter === rowStatus;
        const matchesSearch =
          !normalizedSearch ||
          [
            row.poamId,
            row.controlId,
            row.domain,
            row.requirement,
            row.evidence,
            row.publicNotesUse,
            rowStatus,
            poamNotes[row.key]?.weakness,
            poamNotes[row.key]?.owner,
            poamNotes[row.key]?.date,
            poamNotes[row.key]?.resources,
            poamNotes[row.key]?.milestones,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

        return matchesDomain && matchesStatus && matchesSearch;
      }),
    [domainFilter, normalizedSearch, poamNotes, statusFilter, workflowEvidenceRows]
  );

  const visibleSspControls = useMemo(
    () =>
      workflowEvidenceRows.filter((row) => {
        const matchesDomain = domainFilter === "all" || domainFilter === row.domain;
        const matchesSearch =
          !normalizedSearch ||
          [
            row.domain,
            row.family,
            row.controlId,
            row.requirement,
            row.evidence,
            row.publicNotesUse,
            row.evidenceStatus,
            row.notesGaps,
            ...(row.attachments || []).map((attachment) => attachment.fileName),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

        return matchesDomain && matchesSearch;
      }),
    [domainFilter, normalizedSearch, workflowEvidenceRows]
  );

  const updateSspForm = (field, value) => {
    const workflowAnswerId = sspWorkflowAnswerIds[field];
    if (workflowAnswerId) {
      updateScopeAnswer(workflowAnswerId, value);
      return;
    }

    setSspForm((current) => ({ ...current, [field]: value }));
  };

  const updatePoamNote = (id, field, value) => {
    const workflowField = poamWorkflowFields[field];
    if (workflowField) {
      const poamRow = workflowEvidenceRows.find((row) => row.key === id);
      const controlId = poamRow?.controlId || "";
      updateEvidenceWorkflowField(id, workflowField, value, {
        controlId,
      });
      if (field === "status") {
        if (controlId) {
          updateControlWorkflowStatus(controlId, value, {
            activityType: CMMC_ACTIVITY_TYPES.POAM_REMEDIATION_STATUS_CHANGED,
          });
        }
      }
      return;
    }

    if (field === "milestones") {
      setPoamMilestones((current) => ({ ...current, [id]: value }));
    }
  };

  const attachEvidenceFiles = (controlId, currentAttachments, files) => {
    const nextAttachments = [
      ...(Array.isArray(currentAttachments) ? currentAttachments : []),
      ...Array.from(files || []).map(fileToAttachmentMetadata).filter(Boolean),
    ];

    updateControlAttachments(controlId, nextAttachments);
  };

  const exportSSPToPDF = () => {
    exportCMMCSSPToPDF({
      form: sspFormValues,
      organizationProfile,
      controls: workflowEvidenceRows,
    });
  };

  const exportPOAMToPDF = () => {
    exportCMMCPOAMToPDF({
      organizationProfile,
      assessmentDate: sspFormValues.date,
      rows: visiblePoamRows.map((row) => ({
        ...row,
        poamNotes: poamNotes[row.key] || {},
      })),
    });
  };

  return (
    <section className="mx-auto max-w-6xl space-y-5">
        <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:grid-cols-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-12 items-center justify-center gap-2 border-slate-100 px-4 text-sm font-black transition md:border-r md:last:border-r-0 ${
                  active ? "bg-[#171630] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "ssp" && (
          <SSPView
            form={sspFormValues}
            onChange={updateSspForm}
            controls={visibleSspControls}
            onNoteChange={(evidenceKey, value) => updateEvidenceWorkflowField(evidenceKey, "notesGaps", value)}
            onAttachFiles={attachEvidenceFiles}
            onExportPDF={exportSSPToPDF}
          />
        )}
        {activeTab === "poam" && (
          <POAMView rows={visiblePoamRows} notes={poamNotes} onChange={updatePoamNote} metrics={evidenceMetrics} organizationName={organizationProfile.organizationName} onExportPDF={exportPOAMToPDF} />
        )}
        {activeTab === "policies" && <PolicyView policies={visiblePolicies} metrics={policyMetrics} organizationName={organizationProfile.organizationName} selectedPolicyKey={selectedPolicyKey} />}
    </section>
  );
}

function SSPView({ form, onChange, controls, onNoteChange, onAttachFiles, onExportPDF }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-black text-slate-900">System Security Plan - NIST SP 800-171 Rev 2</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-black text-violet-700">
            Clear Notes
          </button>
          <button type="button" onClick={onExportPDF} className="inline-flex items-center gap-2 rounded-lg bg-[#171630] px-4 py-2 text-sm font-black text-white">
            <Printer size={15} />
            Print / Export PDF
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="border-b-2 border-slate-700 pb-3 text-lg font-black text-slate-900">
          System Information & Organization Details
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="Organization Name" value={form.organizationName} placeholder="Your company or organization name" onChange={(value) => onChange("organizationName", value)} />
          <TextField label="System / Application Name" value={form.systemName} placeholder="Name of the covered system or enclave" onChange={(value) => onChange("systemName", value)} />
          <TextField label="System Owner / ISSO" value={form.owner} placeholder="Name and title of the system owner" onChange={(value) => onChange("owner", value)} />
          <TextField label="SSP Version" value={form.version} onChange={(value) => onChange("version", value)} />
          <TextField label="Date" type="date" value={form.date} onChange={(value) => onChange("date", value)} />
          <TextField label="Current SPRS Score" value={form.currentSprs} onChange={(value) => onChange("currentSprs", value)} />
        </div>
        <TextArea label="System Boundary / Scope" value={form.scope} placeholder="Describe the boundary of the system - what hardware, software, networks, and data are in scope for CUI protection..." onChange={(value) => onChange("scope", value)} />
        <TextArea label="System Environment Description" value={form.environment} placeholder="Describe the operating environment - on-premise, cloud, hybrid, network topology, key technologies in use..." onChange={(value) => onChange("environment", value)} />
        <TextArea label="System Description / Purpose" value={form.purpose} placeholder="Brief description of the system's mission and how it supports your DoD contract work..." onChange={(value) => onChange("purpose", value)} />
      </section>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-slate-600">
        Tip: Fill in each "Implementation Description" below to document how your organization meets the control.
        <span className="font-black text-red-500"> {controls.length} mapped evidence requirements are loaded from the framework library</span>
      </div>

      <div className="space-y-3">
        {controls.map((row) => (
          <article key={row.key} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-violet-600 px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <span className="rounded bg-white/20 px-2 py-1 text-xs font-black">{row.domain}</span>
                <span className="font-black">{row.family}</span>
              </div>
              <span className="text-xs font-bold">{row.evidenceStatus}</span>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-black text-violet-700">{row.controlId}</p>
                <span className="w-fit rounded bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{row.evidenceStatus}</span>
              </div>
              <p className="font-semibold text-slate-700">
                <span className="mr-2 rounded bg-red-50 px-2 py-1 text-xs font-black text-red-500">{row.sourceSystemTool}</span>
                {row.requirement}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Evidence Required: {row.evidence}
              </p>
              <TextArea
                label="Implementation Description"
                value={row.notesGaps}
                placeholder="Describe how this control is implemented in your environment. Include tools, processes, responsible personnel, and specific configurations..."
                onChange={(value) => onNoteChange(row.key, value)}
              />
              <AttachmentSection
                attachments={row.attachments}
                onFilesSelected={(files) => onAttachFiles(row.controlId, row.attachments, files)}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function POAMView({ rows, notes, onChange, metrics, organizationName, onExportPDF }) {
  const displayOrganizationName = organizationName || "[Organization Name]";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-black text-slate-900">Plan of Action & Milestones (POA&M)</h1>
        <button type="button" onClick={onExportPDF} className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#171630] px-4 py-2 text-sm font-black text-white">
          <Printer size={15} />
          Print / Export PDF
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <POAMMetric value={metrics.evidenceCount} label="Evidence Items" tone="text-red-500" />
        <POAMMetric value={metrics.controlCount} label="Mapped Controls" tone="text-red-500" />
        <POAMMetric value={metrics.familyCount} label="Control Families" tone="text-amber-500" />
        <POAMMetric value={metrics.blankStatusCount} label="Blank Status" tone="text-violet-600" />
      </div>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <h2 className="p-4 text-lg font-black text-slate-900">
          POA&M - {displayOrganizationName} - NIST SP 800-171 Rev 2 - Assessment Date:
        </h2>
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-y border-slate-100 bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">POA&M ID / Control</th>
              <th className="px-4 py-3">Requirement</th>
              <th className="px-4 py-3">Weakness / Gap Description</th>
              <th className="px-4 py-3">Responsible Party & Planned Date</th>
              <th className="px-4 py-3">Resources & Milestones</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const note = notes[row.key] || {};

              return (
                <tr key={row.key} className="align-top">
                  <td className="px-4 py-4 font-black text-violet-700">
                    {row.poamId}
                    <br />
                    {row.controlId}
                    <div className="mt-2 flex gap-1">
                      <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-500">{row.sourceSystemTool}</span>
                      <span className="rounded bg-violet-100 px-2 py-1 text-xs text-violet-700">{row.domain}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700">{row.requirement}</td>
                  <td className="px-4 py-4">
                    <textarea value={note.weakness || ""} onChange={(event) => onChange(row.key, "weakness", event.target.value)} placeholder="" rows={3} className="w-full rounded border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                  </td>
                  <td className="space-y-2 px-4 py-4">
                    <input value={note.owner || ""} onChange={(event) => onChange(row.key, "owner", event.target.value)} placeholder="" className="h-9 w-full rounded border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                    <input type="date" value={note.date || ""} onChange={(event) => onChange(row.key, "date", event.target.value)} className="h-9 w-full rounded border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                  </td>
                  <td className="space-y-2 px-4 py-4">
                    <input value={note.resources || ""} onChange={(event) => onChange(row.key, "resources", event.target.value)} placeholder="" className="h-9 w-full rounded border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                    <input value={note.milestones || ""} onChange={(event) => onChange(row.key, "milestones", event.target.value)} placeholder="" className="h-9 w-full rounded border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                  </td>
                  <td className="px-4 py-4">
                    <select value={note.status || ""} onChange={(event) => onChange(row.key, "status", event.target.value)} className="h-9 rounded border border-slate-200 px-2 text-sm font-bold text-slate-600">
                      <option value=""></option>
                      <option>Not Started</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function PolicyView({ policies, metrics, organizationName, selectedPolicyKey }) {
  const displayOrganizationName = organizationName || "[Organization Name]";
  const selectedPolicyRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const openPolicyDocument = (policyKey) => {
    const returnParams = new URLSearchParams(location.search);
    returnParams.set("tab", "policies");
    returnParams.set("item", policyKey);
    navigate(`/policies/${encodeURIComponent(policyKey)}/document`, {
      state: { returnTo: `${location.pathname}?${returnParams.toString()}` },
    });
  };

  useEffect(() => {
    selectedPolicyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedPolicyKey]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-black text-slate-900">Policy Documents - NIST SP 800-171 Rev 2</h1>
        <button type="button" className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#171630] px-4 py-2 text-sm font-black text-white">
          <Printer size={15} />
          Print All Policies
        </button>
      </div>
      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Audit Package Policy Status - {displayOrganizationName}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            A C3PAO assessor will verify that each policy document exists, is approved, and has been communicated to personnel.
          </p>
        </div>
        <div className="flex gap-8 text-center">
          <StatusStat value={metrics.evidenceCount} label="Evidence" tone="text-emerald-500" />
          <StatusStat value={metrics.blankStatusCount} label="Blank Status" tone="text-amber-500" />
          <StatusStat value={metrics.familyCount} label="Families" tone="text-slate-400" />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {policies.map((row) => {
          const isSelected = Boolean(selectedPolicyKey) &&
            (row.key === selectedPolicyKey || row.controlId === selectedPolicyKey);

          return (
          <button
            type="button"
            key={row.key || `${row.domain}-${row.controlId}`}
            ref={isSelected ? selectedPolicyRef : undefined}
            onClick={() => openPolicyDocument(row.key)}
            className={`rounded-lg border bg-white p-5 shadow-sm transition ${
              isSelected ? "border-amber-500 ring-4 ring-amber-100" : "border-slate-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
            }`}
          >
            <p className="text-left text-xs font-black uppercase tracking-wide text-slate-500">
              {row.section} - {row.family}
            </p>
            <h2 className="mt-2 text-left text-lg font-black text-slate-900">{row.controlId}</h2>
            <p className="mt-3 line-clamp-3 min-h-16 text-left text-sm font-semibold leading-6 text-slate-500">{row.evidence}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">{row.evidenceStatus}</span>
              <span className="max-w-[55%] truncate text-xs font-bold text-slate-400">{row.sourceSystemTool || "Open document"}</span>
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}

function applyEvidenceWorkflowFields(row, fieldOverrides = {}, controlFieldOverrides = {}) {
  const evidenceStatus = workflowFieldValue(fieldOverrides, "evidenceStatus", row.evidenceStatus);
  const currentWorkflowStatus = workflowFieldValue(controlFieldOverrides, "status", "");

  return {
    ...row,
    evidenceStatus: workflowFieldValue(controlFieldOverrides, "status", evidenceStatus),
    evidenceWorkflowStatus: evidenceStatus,
    currentWorkflowStatus,
    ownerCollector: workflowFieldValue(fieldOverrides, "ownerCollector", row.ownerCollector),
    dateCollected: workflowFieldValue(fieldOverrides, "dateCollected", row.dateCollected),
    sourceSystemTool: workflowFieldValue(fieldOverrides, "sourceSystemTool", row.sourceSystemTool),
    notesGaps: workflowFieldValue(fieldOverrides, "notesGaps", row.notesGaps),
    attachments: Array.isArray(controlFieldOverrides?.attachments) ? controlFieldOverrides.attachments : [],
  };
}

function workflowFieldValue(fieldOverrides, field, fallback) {
  return Object.prototype.hasOwnProperty.call(fieldOverrides || {}, field) ? fieldOverrides[field] : fallback;
}

function buildPoamNotes(rows, milestones) {
  return rows.reduce((notes, row) => {
    notes[row.key] = {
      weakness: row.notesGaps,
      owner: row.ownerCollector,
      date: row.dateCollected,
      resources: row.sourceSystemTool,
      milestones: Object.prototype.hasOwnProperty.call(milestones, row.key) ? milestones[row.key] : row.evidence,
      status: row.evidenceStatus,
    };
    return notes;
  }, {});
}

function buildWorkflowSspForm(organizationProfile = {}, scopeAnswers = {}) {
  return {
    organizationName: organizationProfile.organizationName || "",
    systemName: organizationProfile.systemName || "",
    scope: getAnswerText(scopeAnswers, "systemBoundaryScope") || buildWorkflowScopeSummary(organizationProfile),
    environment: getAnswerText(scopeAnswers, "systemEnvironmentDescription") || buildWorkflowEnvironmentSummary(organizationProfile, scopeAnswers),
  };
}

function buildWorkflowScopeSummary(organizationProfile = {}) {
  const cuiFlow = organizationProfile.cuiFlow || {};
  const workforce = organizationProfile.workforce || {};
  const externalConnections = organizationProfile.externalConnections || {};

  return [
    workflowSummaryLine("Organization Type", organizationProfile.organizationType),
    workflowSummaryLine("CUI Types", organizationProfile.cuiTypes),
    workflowSummaryLine("CUI Received From", cuiFlow.receivedFrom),
    workflowSummaryLine("CUI Storage Locations", cuiFlow.storageLocations),
    workflowSummaryLine("CUI Transmission Methods", cuiFlow.transmissionMethods),
    workflowSummaryLine("Retention Period", cuiFlow.retentionPeriod),
    workflowSummaryLine("Primary CUI Flow", cuiFlow.flowDescription),
    workflowSummaryLine("Workforce CUI Access", workforce.cuiEmployeeAccess),
    workflowSummaryLine("Remote Workforce", workforce.remoteEmployees),
    workflowSummaryLine("BYOD Use", workforce.byodUse),
    workflowSummaryLine("IT Support", workforce.dedicatedItSupport),
    workflowSummaryLine("VPN Required", externalConnections.vpnRequired),
    workflowSummaryLine("Third-Party Access", externalConnections.thirdPartyAccess),
    workflowSummaryLine("Government / Prime Portals", externalConnections.govPortals),
    workflowSummaryLine("Connection Review", externalConnections.connectionReview),
    workflowSummaryLine("Interconnection Notes", externalConnections.interconnectionNotes),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWorkflowEnvironmentSummary(organizationProfile = {}, scopeAnswers = {}) {
  return [
    workflowSummaryLine("Cloud Platforms", organizationProfile.cloudPlatforms),
    workflowSummaryLine("Email Platform", organizationProfile.emailPlatform),
    workflowSummaryLine("Storage Platform", organizationProfile.storagePlatform),
    workflowSummaryLine("Devices", organizationProfile.devices),
    workflowSummaryLine("On-Premises Servers", getAnswerText(scopeAnswers, "onPremServers")),
    workflowSummaryLine("Network Infrastructure", getAnswerText(scopeAnswers, "networkInfrastructure")),
  ]
    .filter(Boolean)
    .join("\n");
}

function workflowSummaryLine(label, value) {
  const formattedValue = formatWorkflowValue(value);
  return formattedValue ? `${label}: ${formattedValue}` : "";
}

function formatWorkflowValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
  }

  return String(value ?? "").trim();
}

function getAnswerText(scopeAnswers, key) {
  return formatWorkflowValue(scopeAnswers?.[key]);
}

function TextField({ label, value, placeholder, type = "text", onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
    </label>
  );
}

function TextArea({ label, value, placeholder, onChange }) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
    </label>
  );
}

function AttachmentSection({ attachments = [], onFilesSelected }) {
  return (
    <div className="mt-4 rounded border border-slate-200 bg-white px-3 py-3">
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-400">Evidence Attachments</span>
        <input
          type="file"
          multiple
          accept={attachmentAccept}
          onChange={(event) => {
            onFilesSelected?.(event.target.files);
            event.target.value = "";
          }}
          className="mt-2 block w-full text-xs font-semibold text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-xs file:font-black file:text-violet-700"
        />
      </label>
      <div className="mt-3 space-y-2">
        {attachments.map((attachment, index) => (
          <div key={`${attachment.fileName}-${attachment.uploadedAt}-${index}`} className="flex flex-col gap-1 rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-black text-slate-700">{attachment.fileName}</span>
            <span>{attachment.fileType} | {formatFileSize(attachment.fileSize)} | {formatAttachmentDate(attachment.uploadedAt)}</span>
          </div>
        ))}
        {!attachments.length && (
          <p className="text-xs font-semibold text-slate-400">No files attached.</p>
        )}
      </div>
    </div>
  );
}

function fileToAttachmentMetadata(file) {
  const fileType = getSupportedFileType(file);
  if (!fileType) return null;

  return {
    fileName: file.name,
    fileType,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
  };
}

function getSupportedFileType(file) {
  const extension = String(file?.name || "").split(".").pop().toUpperCase();
  if (!supportedAttachmentTypes.has(extension)) return "";
  return extension === "JPEG" ? "JPG" : extension;
}

function formatFileSize(value) {
  const size = Number(value) || 0;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function formatAttachmentDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function POAMMetric({ value, label, tone }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
      <p className={`text-3xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-xs font-black uppercase text-slate-400">{label}</p>
    </div>
  );
}

function StatusStat({ value, label, tone }) {
  return (
    <div>
      <p className={`text-3xl font-black ${tone}`}>{value}</p>
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
    </div>
  );
}

function buildEvidenceRows(library) {
  const controlsById = new Map((library.controls || []).map((control) => [control.controlId || control["Control ID"] || control.id, control]));
  const evidenceById = new Map((library.evidence || []).map((evidence) => [evidence.id, evidence]));

  return (library.mappings || []).flatMap((mapping, mappingIndex) => {
    const control = controlsById.get(mapping.controlId);
    const evidenceIds = mapping.evidenceRequirementIds || mapping.evidenceIds || [];

    return evidenceIds.map((evidenceId, evidenceIndex) => {
      const evidence = evidenceById.get(evidenceId) || {};
      const controlId = mapping.controlId || evidence.controlId || control?.controlId || control?.["Control ID"] || "";
      const controlFamily = evidence.controlFamily || evidence["Control Family"] || control?.controlFamily || control?.["Control Family"] || "";
      const { domain, family, section } = parseControlFamily(controlFamily, controlId);

      return {
        key: `${controlId}-${evidenceId || evidenceIndex}`,
        poamId: "",
        section,
        domain,
        family,
        controlId,
        requirement: control?.controlRequirement || control?.["Control Requirement"] || evidence["Control Requirement"] || "",
        evidence: evidence.evidenceToRequest || evidence["Evidence to Request"] || "",
        publicNotesUse: evidence.publicNotesUse || evidence["Public Notes / Use"] || "",
        evidenceStatus: evidence.evidenceStatus || evidence["Evidence Status"] || "",
        ownerCollector: evidence.ownerCollector || evidence["Owner / Collector"] || "",
        dateCollected: evidence.dateCollected || evidence["Date Collected"] || "",
        sourceSystemTool: evidence.sourceSystemTool || evidence["Source System / Tool"] || "",
        notesGaps: evidence.notesGaps || evidence["Notes / Gaps"] || "",
        sourceOrder: mapping.sourceOrder ?? evidence._sourceOrder ?? control?._sourceOrder ?? mappingIndex,
      };
    });
  });
}

function buildEvidenceMetrics(rows) {
  return {
    evidenceCount: rows.length,
    controlCount: new Set(rows.map((row) => row.controlId)).size,
    familyCount: new Set(rows.map((row) => row.domain)).size,
    blankStatusCount: rows.filter((row) => !row.evidenceStatus).length,
  };
}

function parseControlFamily(controlFamily, controlId) {
  const [domainPart, ...familyNameParts] = controlFamily.split(" - ");
  const domain = domainPart || controlId.split(".")[0] || "";
  const family = familyNameParts.join(" - ") || controlFamily || domain;
  const section = controlId.match(/L2-(3\.\d+)/)?.[1] || "";

  return { domain, family, section };
}

function emptyFrameworkLibrary() {
  return {
    controls: [],
    evidence: [],
    mappings: [],
  };
}
