import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CMMC_FRAMEWORK_ID,
  getFrameworkLibrary,
} from "../../../core/engines/framework-engine/frameworkRegistry";
import { CMMCImplementationLayout, useCMMCWorkspaceFilters } from "../components";
import {
  CMMC_CONTROL_WORKFLOW_STATUS_OPTIONS,
  getCMMCOrganizationProfileSearchText,
  useCMMCSPRSCalculation,
  useCMMCWorkflowState,
} from "../hooks";

const statuses = CMMC_CONTROL_WORKFLOW_STATUS_OPTIONS;
const cmmcLibrary = getFrameworkLibrary(CMMC_FRAMEWORK_ID) || emptyFrameworkLibrary();
const domainGroups = buildDomainGroups(cmmcLibrary);

export default function CMMCOrganizationPage() {
  const { searchQuery, domainFilter, resetVersion, statusFilter } = useCMMCWorkspaceFilters();
  return (
    <CMMCImplementationLayout>
      <CMMCOrganizationContent
        key={resetVersion}
        searchQuery={searchQuery}
        domainFilter={domainFilter}
        statusFilter={statusFilter}
      />
    </CMMCImplementationLayout>
  );
}

function CMMCOrganizationContent({ searchQuery, domainFilter, statusFilter }) {
  const { organizationProfile, controlWorkflowFields, updateControlWorkflowStatus } = useCMMCWorkflowState();
  const sprsMetrics = useCMMCSPRSCalculation();
  const [openDomains, setOpenDomains] = useState({ AC: true });
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const organizationProfileSearchText = useMemo(
    () => getCMMCOrganizationProfileSearchText(organizationProfile),
    [organizationProfile]
  );
  const workflowDomainGroups = useMemo(
    () => applyControlWorkflowFields(domainGroups, controlWorkflowFields),
    [controlWorkflowFields]
  );

  const statusCounts = useMemo(() => {
    if (Number(sprsMetrics.totalControls)) {
      return {
        Completed: Number(sprsMetrics.completedControls) || 0,
        "In Progress": Number(sprsMetrics.inProgressControls) || 0,
        "Not Started": Number(sprsMetrics.notStartedControls) || 0,
      };
    }
    return workflowDomainGroups.flatMap((domain) => domain.controls.map((control) => control.status)).reduce(
      (counts, status) => {
        if (counts[status] !== undefined) counts[status] += 1;
        return counts;
      },
      { "Not Started": 0, "In Progress": 0, Completed: 0 }
    );
  }, [sprsMetrics.completedControls, sprsMetrics.inProgressControls, sprsMetrics.notStartedControls, sprsMetrics.totalControls, workflowDomainGroups]);
  const notStartedTotal = statusCounts["Not Started"];
  const visibleDomains = useMemo(() => {
    return workflowDomainGroups
      .map((domain) => {
        const domainMatches =
          !normalizedSearch ||
          `${domain.code} ${domain.name}`.toLowerCase().includes(normalizedSearch);
        const workflowMatches = Boolean(
          normalizedSearch && organizationProfileSearchText.includes(normalizedSearch)
        );
        const controls = domain.controls.filter((control) => {
          const status = control.status || "";
          const matchesSearch =
            domainMatches ||
            workflowMatches ||
            [
              control.id,
              control.description,
              control.evidence,
              control.objective,
              control.ownerCollector,
              control.dateCollected,
              control.sourceSystemTool,
              control.notesGaps,
              status,
              domain.code,
              domain.name,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch);
          const matchesDomain = domainFilter === "all" || domainFilter === domain.code;
          const matchesStatus = statusFilter === "All" || statusFilter === status;

          return matchesSearch && matchesDomain && matchesStatus;
        });

        return { ...domain, controls };
      })
      .filter((domain) => domain.controls.length > 0);
  }, [domainFilter, normalizedSearch, organizationProfileSearchText, statusFilter, workflowDomainGroups]);

  const updateStatus = (controlKey, status) => {
    updateControlWorkflowStatus(controlKey, status);
  };

  return (
    <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatusCard value={statusCounts.Completed} label="Completed" tone="text-emerald-500" />
          <StatusCard value={statusCounts["In Progress"]} label="In Progress" tone="text-amber-500" />
          <StatusCard value={notStartedTotal} label="Not Started" tone="text-slate-900" />
          <StatusCard value={domainGroups.length} label="Domains" tone="text-slate-400" />
        </div>

        <div className="space-y-2">
          {visibleDomains.map((domain) => {
            const isOpen = Boolean(openDomains[domain.code]);
            const completedCount = domain.controls.filter(
              (control) => control.status === "Completed"
            ).length;

            return (
              <section key={domain.code} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenDomains((current) => ({ ...current, [domain.code]: !current[domain.code] }))}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-black transition ${
                    isOpen ? "bg-violet-600 text-white" : "bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className={`mr-3 rounded px-2 py-1 text-xs ${isOpen ? "bg-white/15" : "bg-violet-50 text-violet-700"}`}>
                      {domain.code}
                    </span>
                    {domain.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {completedCount}/{domain.total}
                    <ChevronDown size={16} className={`transition ${isOpen ? "rotate-180" : ""}`} />
                  </span>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left text-sm">
                      <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="w-12 px-4 py-3">Done</th>
                          <th className="w-24 px-4 py-3">Control ID</th>
                          <th className="px-4 py-3">Control Description</th>
                          <th className="w-48 px-4 py-3">Evidence Needed</th>
                          <th className="w-56 px-4 py-3">Assessment Objective</th>
                          <th className="w-40 px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {domain.controls.map((control) => {
                          const controlKey = control.key;
                          const status = control.status || "";

                          return (
                            <tr key={controlKey} className="align-top transition hover:bg-slate-50/70">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={status === "Completed"}
                                  onChange={(event) => updateStatus(control.workflowKey, event.target.checked ? "Completed" : "Not Started")}
                                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                />
                              </td>
                              <td className="px-4 py-3 font-black text-violet-700">{control.id}</td>
                              <td className="px-4 py-3 font-semibold leading-5 text-slate-700">{control.description}</td>
                              <td className="px-4 py-3 text-xs font-semibold leading-5 text-violet-600">{control.evidence}</td>
                              <td className="px-4 py-3 text-xs font-semibold leading-5 text-slate-500">{control.objective}</td>
                              <td className="px-4 py-3">
                                <select
                                  value={status}
                                  onChange={(event) => updateStatus(control.workflowKey, event.target.value)}
                                  className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                                >
                                  <option value=""></option>
                                  {statuses.map((statusOption) => (
                                    <option key={statusOption} value={statusOption}>{statusOption}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
    </div>
  );
}

function StatusCard({ value, label, tone }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className={`text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-xs font-black uppercase text-slate-400">{label}</p>
    </div>
  );
}

function applyControlWorkflowFields(domainGroups, controlWorkflowFields = {}) {
  return domainGroups.map((domain) => ({
    ...domain,
    controls: domain.controls.map((control) => ({
      ...control,
      status: workflowFieldValue(controlWorkflowFields[control.workflowKey], "status", control.status),
    })),
  }));
}

function workflowFieldValue(fieldOverrides, field, fallback) {
  return Object.prototype.hasOwnProperty.call(fieldOverrides || {}, field) ? fieldOverrides[field] : fallback;
}

function buildDomainGroups(library) {
  const evidenceById = new Map((library.evidence || []).map((item) => [item.id, item]));
  const mappingByControlId = new Map((library.mappings || []).map((mapping) => [mapping.controlId, mapping]));
  const domainsByCode = new Map();

  (library.controls || []).forEach((control) => {
    const controlId = control.controlId || control["Control ID"] || control.id || "";
    const controlFamily = control.controlFamily || control["Control Family"] || "";
    const { code, name } = parseControlFamily(controlFamily, controlId);
    const mapping = mappingByControlId.get(controlId) || {};
    const evidenceItems = (mapping.evidenceRequirementIds || mapping.evidenceIds || [])
      .map((evidenceId) => evidenceById.get(evidenceId))
      .filter(Boolean);

    if (!domainsByCode.has(code)) {
      domainsByCode.set(code, {
        code,
        name,
        total: 0,
        controls: [],
      });
    }

    const domain = domainsByCode.get(code);
    domain.controls.push({
      key: `${code}-${controlId}`,
      workflowKey: controlId,
      id: controlId,
      description: control.controlRequirement || control["Control Requirement"] || "",
      evidence: joinedEvidenceField(evidenceItems, "evidenceToRequest", "Evidence to Request"),
      objective: joinedEvidenceField(evidenceItems, "publicNotesUse", "Public Notes / Use"),
      status: firstEvidenceField(evidenceItems, "evidenceStatus", "Evidence Status"),
      ownerCollector: firstEvidenceField(evidenceItems, "ownerCollector", "Owner / Collector"),
      dateCollected: firstEvidenceField(evidenceItems, "dateCollected", "Date Collected"),
      sourceSystemTool: firstEvidenceField(evidenceItems, "sourceSystemTool", "Source System / Tool"),
      notesGaps: firstEvidenceField(evidenceItems, "notesGaps", "Notes / Gaps"),
    });
    domain.total = domain.controls.length;
  });

  return Array.from(domainsByCode.values());
}

function parseControlFamily(controlFamily, controlId) {
  const [familyCode, ...familyNameParts] = controlFamily.split(" - ");
  const code = familyCode || controlId.split(".")[0] || "";
  const name = familyNameParts.join(" - ") || controlFamily || code;
  return { code, name };
}

function joinedEvidenceField(evidenceItems, camelCaseField, sourceField) {
  if (!evidenceItems.length) return "";
  return evidenceItems
    .map((item) => item[camelCaseField] ?? item[sourceField] ?? "")
    .join("\n");
}

function firstEvidenceField(evidenceItems, camelCaseField, sourceField) {
  if (!evidenceItems.length) return "";
  return evidenceItems[0]?.[camelCaseField] ?? evidenceItems[0]?.[sourceField] ?? "";
}

function emptyFrameworkLibrary() {
  return {
    controls: [],
    evidence: [],
    mappings: [],
  };
}
