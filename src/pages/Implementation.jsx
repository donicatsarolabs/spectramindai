import {
  ArrowRight,
  ArrowUpDown,
  X,
  ChevronDown,
  Download,
  FileText,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
} from "lucide-react";
import { Component, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../auth/UserContext";
import { readScopedJson } from "../auth/session";
import AppShell from "../components/layout/AppShell";
import { useFrameworkData } from "../core/adapters/useFrameworkData";
import { useRelationshipGraph, getLinkedItemsFromGraph } from "../core/adapters/useRelationshipGraph";
import { useOrganizationStore } from "../core/adapters/useOrganizationStore";
import { useComplianceState } from "../compliance/ComplianceStateContext";
import { DEFAULT_FRAMEWORK_ID, ISO27001_FRAMEWORK_ID, resolveFrameworkId } from "../core/engines/framework-engine/frameworkRegistry";
import { frameworks } from "../data/mockData";
import EvidenceManagementSection from "../evidence/EvidenceManagementSection";
import { CMMCProgressRing } from "../features/cmmc/components";
import { cmmcDomains } from "../features/cmmc/data";
import { buildCrossModuleTarget, implementationTabForItemType } from "../navigation/crossModuleNavigation";
import {
  getQuestionnaireApplicability,
  isRelevantToQuestionnaire,
  loadQuestionnaireResponses,
} from "../data/questionnaireEngine";
import { useFrameworkWorkspace } from "../framework/FrameworkWorkspaceContext";

const implementationTabs = [
  "Risk Scenarios",
  "Controls",
  "Tests",
  "Policies",
  "Populations",
];

const iso27001ImplementationTabs = [
  "Risk Scenarios",
  "Controls",
  "Tests",
  "Mandatory Docs",
];

const cmmcImplementationTabs = [
  "Overview",
  "Domains",
  "Controls",
  "Assessment Objectives",
  "Evidence",
  "Policies",
  "SSP",
  "POA&M",
  "Auditor",
  "Export",
];

const cmmcOverviewMetrics = [
  { id: "score", title: "Compliance Score", value: 42, caption: "Initial readiness baseline", color: "#9d6f38" },
  { id: "risk", title: "Risk Progress", value: 18, caption: "20 / 110 assessed", color: "#a87534" },
  { id: "controls", title: "Control Progress", value: 31, caption: "34 / 110 completed", color: "#785026" },
  { id: "assessment", title: "Assessment Progress", value: 24, caption: "Objectives in review", color: "#bf9252" },
  { id: "evidence", title: "Evidence Progress", value: 38, caption: "Evidence collection active", color: "#5f574c" },
  { id: "policies", title: "Policy Progress", value: 64, caption: "9 / 14 approved", color: "#d8b46d" },
  { id: "audit", title: "Audit Readiness", value: 27, caption: "Assessment in progress", color: "#4d463b" },
];

const cmmcDomainMockData = {
  AC: {
    description: "Limit system access to authorized users, processes, and devices.",
    progress: 42,
    status: "In Progress",
    evidenceCount: 18,
    policyCount: 3,
  },
  AT: {
    description: "Prepare personnel to recognize security responsibilities and threats.",
    progress: 68,
    status: "Ready",
    evidenceCount: 7,
    policyCount: 2,
  },
  AU: {
    description: "Create, protect, and review audit records for covered systems.",
    progress: 36,
    status: "In Progress",
    evidenceCount: 12,
    policyCount: 2,
  },
  CM: {
    description: "Establish secure configuration baselines and control system changes.",
    progress: 29,
    status: "Needs Review",
    evidenceCount: 9,
    policyCount: 2,
  },
  IA: {
    description: "Identify users and authenticate access before system use.",
    progress: 54,
    status: "In Progress",
    evidenceCount: 15,
    policyCount: 2,
  },
  IR: {
    description: "Plan, test, and coordinate response to cybersecurity incidents.",
    progress: 22,
    status: "Not Started",
    evidenceCount: 3,
    policyCount: 1,
  },
  MA: {
    description: "Control maintenance activity and protect systems during service.",
    progress: 47,
    status: "In Progress",
    evidenceCount: 8,
    policyCount: 1,
  },
  MP: {
    description: "Protect media containing CUI through handling, storage, and disposal.",
    progress: 33,
    status: "Needs Review",
    evidenceCount: 6,
    policyCount: 2,
  },
  PE: {
    description: "Limit physical access to systems, facilities, and operating areas.",
    progress: 61,
    status: "Ready",
    evidenceCount: 10,
    policyCount: 1,
  },
  PS: {
    description: "Screen personnel and protect access during role changes or separation.",
    progress: 74,
    status: "Ready",
    evidenceCount: 5,
    policyCount: 1,
  },
  RA: {
    description: "Identify, scan, and prioritize cybersecurity risks to the environment.",
    progress: 39,
    status: "In Progress",
    evidenceCount: 7,
    policyCount: 1,
  },
  CA: {
    description: "Assess security controls and manage plans of action.",
    progress: 26,
    status: "Needs Review",
    evidenceCount: 4,
    policyCount: 1,
  },
  SC: {
    description: "Protect communications boundaries and information in transit.",
    progress: 31,
    status: "In Progress",
    evidenceCount: 11,
    policyCount: 2,
  },
  SI: {
    description: "Identify flaws, monitor alerts, and protect systems from malicious code.",
    progress: 45,
    status: "In Progress",
    evidenceCount: 9,
    policyCount: 2,
  },
};

const cmmcControlsMockData = [
  {
    id: "AC.L1-3.1.1",
    name: "Limit system access to authorized users.",
    domainCode: "AC",
    status: "In Progress",
    priority: "High",
    progress: 48,
    objectives: 3,
    evidence: 2,
    policies: 1,
    description: "Verify that only authorized users, processes, and devices can access covered systems.",
    guidance: "Confirm role-based access, account approval records, and periodic user access reviews are documented.",
  },
  {
    id: "AC.L1-3.1.2",
    name: "Limit transactions and functions to authorized users.",
    domainCode: "AC",
    status: "In Progress",
    priority: "High",
    progress: 41,
    objectives: 3,
    evidence: 2,
    policies: 1,
    description: "Restrict privileged actions and business functions to users with approved responsibilities.",
    guidance: "Map roles to permitted actions and collect screenshots or exports that show privilege boundaries.",
  },
  {
    id: "IA.L1-3.5.1",
    name: "Identify information system users.",
    domainCode: "IA",
    status: "Completed",
    priority: "High",
    progress: 82,
    objectives: 2,
    evidence: 4,
    policies: 1,
    description: "Identify users, processes, or devices before granting access to organizational systems.",
    guidance: "Keep identity provider settings, account inventories, and onboarding records aligned with access procedures.",
  },
  {
    id: "IA.L1-3.5.2",
    name: "Authenticate users before access.",
    domainCode: "IA",
    status: "In Progress",
    priority: "High",
    progress: 63,
    objectives: 2,
    evidence: 3,
    policies: 1,
    description: "Authenticate users, processes, or devices as a condition of system access.",
    guidance: "Document MFA settings, password policy enforcement, and authentication logs for scoped systems.",
  },
  {
    id: "MP.L1-3.8.3",
    name: "Sanitize or destroy media before disposal.",
    domainCode: "MP",
    status: "Not Started",
    priority: "Medium",
    progress: 12,
    objectives: 2,
    evidence: 0,
    policies: 1,
    description: "Protect CUI by sanitizing or destroying media before reuse, release, or disposal.",
    guidance: "Define disposal procedures and collect destruction certificates or wipe records when available.",
  },
  {
    id: "PE.L1-3.10.1",
    name: "Limit physical access to systems.",
    domainCode: "PE",
    status: "Completed",
    priority: "Medium",
    progress: 76,
    objectives: 2,
    evidence: 3,
    policies: 1,
    description: "Limit physical access to organizational systems, equipment, and operating environments.",
    guidance: "Use badge access records, visitor logs, and facility access procedures as supporting evidence.",
  },
  {
    id: "RA.L2-3.11.2",
    name: "Scan for vulnerabilities.",
    domainCode: "RA",
    status: "In Progress",
    priority: "High",
    progress: 52,
    objectives: 4,
    evidence: 2,
    policies: 1,
    description: "Scan systems periodically and when new vulnerabilities affecting those systems are identified.",
    guidance: "Capture scan cadence, scanner configuration, recent reports, and remediation ownership.",
  },
  {
    id: "CA.L2-3.12.2",
    name: "Develop and implement plans of action.",
    domainCode: "CA",
    status: "In Progress",
    priority: "Medium",
    progress: 35,
    objectives: 3,
    evidence: 1,
    policies: 1,
    description: "Create plans of action to correct deficiencies and reduce risk across scoped systems.",
    guidance: "Track owners, due dates, remediation evidence, and management review of open actions.",
  },
  {
    id: "SC.L1-3.13.1",
    name: "Monitor and control communications boundaries.",
    domainCode: "SC",
    status: "In Progress",
    priority: "High",
    progress: 44,
    objectives: 3,
    evidence: 2,
    policies: 1,
    description: "Monitor, control, and protect organizational communications at external boundaries.",
    guidance: "Collect firewall rules, network diagrams, boundary device configurations, and review records.",
  },
  {
    id: "SI.L1-3.14.1",
    name: "Identify and correct system flaws.",
    domainCode: "SI",
    status: "In Progress",
    priority: "Medium",
    progress: 58,
    objectives: 3,
    evidence: 3,
    policies: 1,
    description: "Identify, report, and correct information system flaws in a timely manner.",
    guidance: "Use patch reports, vulnerability tickets, change records, and exception reviews as evidence.",
  },
  {
    id: "IR.L2-3.6.1",
    name: "Establish incident response capability.",
    domainCode: "IR",
    status: "Not Started",
    priority: "Medium",
    progress: 18,
    objectives: 3,
    evidence: 1,
    policies: 1,
    description: "Establish operational incident handling capability for preparation, detection, analysis, and recovery.",
    guidance: "Prepare response procedures, escalation paths, incident templates, and tabletop exercise records.",
  },
  {
    id: "AT.L2-3.2.1",
    name: "Ensure managers and users understand security risks.",
    domainCode: "AT",
    status: "Completed",
    priority: "Low",
    progress: 88,
    objectives: 2,
    evidence: 5,
    policies: 1,
    description: "Ensure workforce members understand cybersecurity risks associated with their activities.",
    guidance: "Retain training assignments, completion exports, role-specific training content, and review cadence.",
  },
];

const cmmcControlStatusFilters = ["All", "Not Started", "In Progress", "Completed"];
const cmmcControlPriorityFilters = ["All", "High", "Medium", "Low"];
const cmmcEvidenceStatusFilters = ["All", "Pending", "Approved", "Rejected"];
const cmmcEvidenceTypeFilters = ["All", "Screenshot", "Policy", "Configuration", "Log", "Report", "Document"];
const cmmcPolicyStatusFilters = ["All", "Draft", "Under Review", "Approved"];
const cmmcPolicyCategoryFilters = [
  "All",
  "Access Control",
  "Incident Response",
  "Configuration Management",
  "Personnel Security",
  "System Protection",
];
const cmmcPOAMStatusFilters = ["All", "Open", "In Progress", "Completed"];
const cmmcPOAMRiskFilters = ["All", "High", "Medium", "Low"];

const cmmcPoliciesMockData = [
  {
    id: "POL-001",
    name: "Access Control Policy",
    category: "Access Control",
    status: "Approved",
    version: "1.2",
    owner: "Security",
    lastUpdated: "2026-06-14",
    reviewDate: "2026-09-14",
    domainCodes: ["AC", "IA"],
    description: "Defines identity, authentication, authorization, and access review expectations for scoped systems.",
    purpose: "Ensure access to CMMC systems is limited to authorized users and approved business functions.",
    scope: "Applies to production applications, identity services, privileged access, and administrative workflows.",
    notes: "Ready for inclusion in the mock assessment package after final owner acknowledgement.",
  },
  {
    id: "POL-002",
    name: "Incident Response Policy",
    category: "Incident Response",
    status: "Under Review",
    version: "0.9",
    owner: "Security",
    lastUpdated: "2026-06-08",
    reviewDate: "2026-07-22",
    domainCodes: ["IR"],
    description: "Documents incident preparation, escalation, analysis, containment, recovery, and lessons learned practices.",
    purpose: "Provide a repeatable response model for cybersecurity events affecting the CMMC environment.",
    scope: "Applies to security incidents, suspected CUI exposure, and events affecting production services.",
    notes: "Needs tabletop evidence and escalation owner review before approval.",
  },
  {
    id: "POL-003",
    name: "Configuration Management Policy",
    category: "Configuration Management",
    status: "Draft",
    version: "0.7",
    owner: "IT Operations",
    lastUpdated: "2026-06-03",
    reviewDate: "2026-08-01",
    domainCodes: ["CA", "RA", "SI"],
    description: "Sets expectations for secure baselines, change review, vulnerability handling, and remediation tracking.",
    purpose: "Keep system configurations controlled, reviewed, and aligned with CMMC implementation expectations.",
    scope: "Applies to cloud services, application configuration, infrastructure settings, and security tooling.",
    notes: "Draft language should be aligned with POA&M and vulnerability management procedures.",
  },
  {
    id: "POL-004",
    name: "Personnel Security Policy",
    category: "Personnel Security",
    status: "Approved",
    version: "1.1",
    owner: "HR",
    lastUpdated: "2026-05-28",
    reviewDate: "2026-11-28",
    domainCodes: ["AT", "PE"],
    description: "Defines workforce security responsibilities, training expectations, and access handling during role changes.",
    purpose: "Ensure personnel understand security obligations and access changes are governed consistently.",
    scope: "Applies to employees, contractors, managers, and administrators supporting the scoped environment.",
    notes: "Policy is approved; maintain latest training completion exports with the evidence package.",
  },
  {
    id: "POL-005",
    name: "System Protection Policy",
    category: "System Protection",
    status: "Under Review",
    version: "1.0",
    owner: "Engineering",
    lastUpdated: "2026-06-19",
    reviewDate: "2026-08-18",
    domainCodes: ["SC", "SI", "MP"],
    description: "Documents boundary protection, system integrity, media handling, and monitoring expectations.",
    purpose: "Protect CMMC systems and CUI-supporting services through technical safeguards and operational review.",
    scope: "Applies to networks, system monitoring, vulnerability remediation, media handling, and service boundaries.",
    notes: "Engineering review is in progress for boundary diagrams and monitoring responsibilities.",
  },
];

const CMMC_RING_SIZE = 106;
const CMMC_RING_STROKE = 10;
const CMMC_RING_DURATION_MS = 1100;
const CMMC_CARD_STAGGER_MS = 70;
const CMMC_AUDITOR_RING_SIZE = 132;
const CMMC_AUDITOR_RING_STROKE = 12;
const CMMC_RING_TRACK_COLOR = "#ece7dc";
const CMMC_RING_TEXT_COLOR = "#25221d";
const DEFAULT_CMMC_DOMAIN = "AC";

const cmmcSSPMockData = {
  organization: {
    "Organization Name": "SpectraMinds Defense Systems",
    "Business Unit": "Secure Cloud Operations",
    "Primary Contact": "Maya Patel",
    Email: "maya.patel@spectraminds.example",
    "Assessment Scope": "CMMC Level 2 readiness for the production compliance platform",
  },
  system: {
    "System Name": "SpectraMinds Compliance Workspace",
    Hosting: "Cloud-hosted SaaS",
    "Cloud Provider": "AWS GovCloud",
    "Production Environment": "Production and staging workloads",
    Criticality: "High",
  },
  boundary: {
    "Included Systems": "Application services, identity provider, database tier, logging pipeline, evidence repository",
    "Excluded Systems": "Corporate email, marketing website, sandbox labs, personal productivity tools",
    "Connected Services": "SSO, vulnerability scanner, endpoint management, ticketing, secure file storage",
  },
  cuiDescription:
    "The system stores and processes controlled contract artifacts, security control evidence, assessment notes, and limited operational metadata that may support CUI handling obligations for defense customers.",
  purpose:
    "The system centralizes CMMC readiness work by connecting domains, controls, assessment objectives, evidence, policy references, and audit preparation activities in a single compliance workspace.",
  environment:
    "Production services run in a segmented cloud environment with managed identity, encrypted storage, centralized monitoring, restricted administrative access, and separate change-controlled deployment paths.",
  responsibilities: ["IT", "Security", "Compliance", "HR", "Engineering"],
  assets: [
    ["Applications", "4"],
    ["Servers", "18"],
    ["Databases", "3"],
    ["Endpoints", "86"],
    ["Connected Services", "7"],
  ],
};

const emptyImplementationData = {
  risks: [],
  controls: [],
  tests: [],
  policies: [],
  populations: [],
};

const riskColumns = [
  { key: "id", label: "ID" },
  { key: "title", label: "Description" },
  { key: "status", label: "Status" },
  { key: "progressStatus", label: "Progress" },
  { key: "owner", label: "Assigned To" },
  { key: "dueDate", label: "Due Date" },
  { key: "category", label: "Category" },
  { key: "initialRiskScore", label: "Initial Risk Score" },
  { key: "residualRiskScore", label: "Residual Risk Score" },
  { key: "controls", label: "Controls" },
  { key: "comments", label: "Comment" },
];

const controlColumns = [
  { key: "id", label: "ID" },
  { key: "title", label: "Description" },
  { key: "status", label: "Status" },
  { key: "progressStatus", label: "Progress" },
  { key: "owner", label: "Assigned To" },
  { key: "dueDate", label: "Due Date" },
  { key: "category", label: "Category" },
  { key: "trustServiceCriteria", label: "Trust Service Criteria" },
  { key: "mappedTests", label: "Tests" },
  { key: "mappedRisks", label: "Risk Scenarios" },
];

const testColumns = [
  { key: "id", label: "ID" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "progressStatus", label: "Progress" },
  { key: "owner", label: "Assigned To" },
  { key: "dueDate", label: "Due Date" },
  { key: "category", label: "Category" },
  { key: "comments", label: "Comments" },
];

const policyColumns = [
  { key: "id", label: "ID" },
  { key: "title", label: "Policy" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Assigned To" },
  { key: "dueDate", label: "Due Date" },
  { key: "category", label: "Category" },
  { key: "comments", label: "Comments" },
];

const populationColumns = [
  { key: "id", label: "ID" },
  { key: "title", label: "Description" },
  { key: "status", label: "Status" },
  { key: "progressStatus", label: "Progress" },
  { key: "owner", label: "Assigned To" },
  { key: "dueDate", label: "Due Date" },
  { key: "category", label: "Category" },
  { key: "mappedTests", label: "Tests" },
  { key: "comments", label: "Comments" },
];

export default function Implementation() {
  const location = useLocation();
  const navigate = useNavigate();
  const frameworkWorkspace = useFrameworkWorkspace();
  const [activeTab, setActiveTab] = useState("Tests");
  const selectedFramework = getSelectedFramework(location);
  const selectedFrameworkId = resolveFrameworkId(selectedFramework?.slug) || DEFAULT_FRAMEWORK_ID;

  // OrganizationEngine now owns workspace state — routes status changes through
  // trackControlStatus() with full audit history, while keeping the legacy
  // flat-map format that all downstream components already read.
  const { workspaceData, saveWorkspaceItem } = useOrganizationStore(selectedFrameworkId);

  const [questionnaireResponses, setQuestionnaireResponses] = useState(() => loadQuestionnaireResponses(selectedFrameworkId));
  const isCMMC = isCMMCFramework(selectedFramework);
  const shouldRedirectToCanonicalCMMC = isCMMC || (!selectedFramework && isCMMCFramework(frameworkWorkspace.activeFramework));
  const isISO27001 = selectedFrameworkId === ISO27001_FRAMEWORK_ID;
  const currentTabs = isCMMC ? cmmcImplementationTabs : isISO27001 ? iso27001ImplementationTabs : implementationTabs;
  const defaultActiveTab = isCMMC ? "Overview" : isISO27001 ? "Mandatory Docs" : "Tests";
  const visibleActiveTab = currentTabs.includes(activeTab) ? activeTab : defaultActiveTab;
  // FrameworkEngine is now the source of truth — the framework library JSON
  // files are never modified. useFrameworkData returns the same shape that
  // getFrameworkLibrary() previously returned so all downstream components
  // continue to work without any changes.
  const rawImplementationData = useFrameworkData(selectedFramework?.slug);

  const implementationData = useMemo(() => {
    if (!rawImplementationData || !rawImplementationData.controls) {
      return { controls: [], risks: [], tests: [], policies: [], populations: [] };
    }

    const risks = rawImplementationData.risks.map((r) => {
      const saved = (workspaceData && workspaceData[r.id]) ?? {};
      const initialLikelihood = saved.initialLikelihood ?? 3;
      const initialImpact = saved.initialImpact ?? 5;
      const residualLikelihood = saved.residualLikelihood ?? 1;
      const residualImpact = saved.residualImpact ?? 3;
      return {
        ...r,
        owner: saved.assignments?.owner || "Unassigned",
        status: saved.status || r.status || "Ready",
        dueDate: saved.dueDate || r.dueDate || "",
        initialRiskScore: initialLikelihood * initialImpact,
        residualRiskScore: residualLikelihood * residualImpact,
        comments: saved.comments?.length || "",
      };
    });

    const controls = rawImplementationData.controls.map((c) => {
      const saved = (workspaceData && workspaceData[c.id]) ?? {};
      return {
        ...c,
        owner: saved.assignments?.owner || "Unassigned",
        status: saved.status || c.status || "Ready",
        dueDate: saved.dueDate || c.dueDate || "",
        comments: saved.comments?.length || "",
      };
    });

    const tests = rawImplementationData.tests.map((t) => {
      const saved = (workspaceData && workspaceData[t.id]) ?? {};
      return {
        ...t,
        owner: saved.assignments?.owner || "Unassigned",
        status: saved.status || t.status || "Ready",
        dueDate: saved.dueDate || t.dueDate || "",
        comments: saved.comments?.length || "",
      };
    });

    const policies = rawImplementationData.policies.map((p) => {
      const saved = (workspaceData && workspaceData[p.id]) ?? {};
      return {
        ...p,
        owner: saved.assignments?.owner || "Unassigned",
        status: saved.status || p.status || "Ready",
        dueDate: saved.dueDate || p.dueDate || "",
        comments: saved.comments?.length || "",
      };
    });

    const populations = rawImplementationData.populations.map((p) => {
      const saved = (workspaceData && workspaceData[p.id]) ?? {};
      return {
        ...p,
        owner: saved.assignments?.owner || "Unassigned",
        status: saved.status || p.status || "Ready",
        dueDate: saved.dueDate || p.dueDate || "",
        comments: saved.comments?.length || "",
      };
    });

    return {
      ...rawImplementationData,
      risks,
      controls,
      tests,
      policies,
      populations,
    };
  }, [rawImplementationData, workspaceData]);

  // RelationshipEngine is seeded from the framework mappings JSON so the
  // workspace panel resolves linked items via graph lookups instead of
  // hardcoded array references.
  const relationshipGraph = useRelationshipGraph(selectedFramework?.slug);

  const [workspaceItem, setWorkspaceItem] = useState(() =>
    getWorkspaceItemFromLocation(window.location, implementationData)
  );
  const [isWorkspaceClosing, setIsWorkspaceClosing] = useState(false);
  const selectWorkspaceItem = (item, { replace = false } = {}) => {
    setIsWorkspaceClosing(false);
    setWorkspaceItem(item);
    updateWorkspaceHistory(item, replace);
  };
  const closeWorkspaceItem = () => {
    setIsWorkspaceClosing(true);
    updateWorkspaceHistory(null);
    window.setTimeout(() => {
      setWorkspaceItem(null);
      setIsWorkspaceClosing(false);
    }, 200);
  };
  const navigateRelatedItem = (type, relatedItem, { mode = "resolve" } = {}) => {
    if (!relatedItem?.id) return;

    const implementationType = {
      Control: "Control",
      Test: "Test",
      Risk: "Risk",
      Policy: "Policy",
      Population: "Population",
      Implementation: "Population",
    }[type];

    if (implementationType) {
      setActiveTab(implementationTabForItemType(implementationType, visibleActiveTab));
      selectWorkspaceItem(createWorkspaceItem(implementationType, relatedItem));
      return;
    }

    const target = buildCrossModuleTarget({
      activeFramework: selectedFramework,
      itemId: relatedItem.id,
      itemType: type,
      moduleContext: relatedItem.title || relatedItem.name || "",
      mode,
    });
    navigate(target.path, { state: target.state });
  };

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setActiveTab(defaultActiveTab));

    return () => cancelAnimationFrame(frameId);
  }, [defaultActiveTab, selectedFramework?.slug]);

  useEffect(() => {
    const syncWorkspaceFromUrl = () => {
      setWorkspaceItem(getWorkspaceItemFromLocation(window.location, implementationData));
    };

    window.addEventListener("popstate", syncWorkspaceFromUrl);

    return () => window.removeEventListener("popstate", syncWorkspaceFromUrl);
  }, [implementationData]);

  useEffect(() => {
    const refreshQuestionnaireResponses = () => setQuestionnaireResponses(loadQuestionnaireResponses(selectedFrameworkId));
    window.addEventListener("spectramind:questionnaire-updated", refreshQuestionnaireResponses);
    window.addEventListener("storage", refreshQuestionnaireResponses);

    return () => {
      window.removeEventListener("spectramind:questionnaire-updated", refreshQuestionnaireResponses);
      window.removeEventListener("storage", refreshQuestionnaireResponses);
    };
  }, [selectedFrameworkId]);

  if (shouldRedirectToCanonicalCMMC) {
    return <CanonicalCMMCRedirect frameworkWorkspace={frameworkWorkspace} />;
  }

  if (!selectedFramework && frameworkWorkspace.activeFramework?.slug) {
    return <Navigate to={`/implementation?framework=${frameworkWorkspace.activeFramework.slug}`} replace />;
  }

  if (!selectedFramework) {
    return <SelectFrameworkScreen />;
  }

  const shouldShowWorkspace = !isCMMC && workspaceItem;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 rounded-lg border border-white/75 bg-white/62 px-5 py-4 shadow-xl shadow-slate-900/5 backdrop-blur lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-normal text-slate-900">
              Compliance Implementation
            </h1>
            <p className="mt-3 text-2xl font-black text-slate-900">
              {selectedFramework.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
              Description of System
            </button>
            <ExportMenu data={implementationData} />
          </div>
        </div>

        <section className="grid gap-4 xl:grid-cols-1 xl:items-start">
          <div className="min-w-0 space-y-3">
            {!isCMMC && <OverviewRings data={implementationData} workspaceData={workspaceData} selectedFramework={selectedFramework} />}
            <ImplementationTabs tabs={currentTabs} activeTab={visibleActiveTab} onTabChange={setActiveTab} />

            <TabPanel
              activeTab={visibleActiveTab}
              selectedFramework={selectedFramework}
              data={implementationData}
              questionnaireResponses={questionnaireResponses}
              workspaceData={workspaceData}
              onSelectWorkspaceItem={selectWorkspaceItem}
            />
          </div>

          {shouldShowWorkspace && (
            <div
              className={`fixed inset-y-0 right-0 z-50 w-full max-w-[430px] transform border-l border-slate-200 bg-white shadow-xl shadow-slate-900/10 transition-transform duration-200 ease-out ${
                isWorkspaceClosing ? "translate-x-full" : "translate-x-0"
              }`}
            >
              <WorkspaceErrorBoundary itemKey={workspaceItem.id} onClose={closeWorkspaceItem}>
                <ImplementationWorkspace
                  key={workspaceItem.id}
                  item={workspaceItem}
                  framework={selectedFramework}
                  data={implementationData}
                  savedState={workspaceData && workspaceData[workspaceItem.id]}
                  relationshipGraph={relationshipGraph}
                  onWorkspaceStateChange={(itemId, nextState) => {
                    // Route through OrganizationEngine for proper audit tracking,
                    // then the hook syncs both the engine snapshot and the legacy
                    // flat-map so all downstream reads continue to work.
                    saveWorkspaceItem(itemId, nextState);
                  }}
                  onNavigateRelatedItem={navigateRelatedItem}
                  onClose={closeWorkspaceItem}
                />
              </WorkspaceErrorBoundary>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SelectFrameworkScreen() {
  const { selectFramework } = useFrameworkWorkspace();

  return (
    <AppShell>
      <div className="space-y-7">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-blue-700">
            Compliance Implementation
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-normal text-slate-900">
            Select a Framework
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Choose a framework to open its implementation workspace.
          </p>
        </div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {frameworks.map((framework) => {
            const slug = framework.slug || slugifyFramework(framework.name);
            const isCMMCCard = isCMMCFramework(framework);

            return (
              <Link
                key={framework.id}
                to={isCMMCCard ? "/cmmc" : `/implementation?framework=${slug}`}
                state={isCMMCCard ? undefined : { framework }}
                onClick={isCMMCCard ? () => selectFramework("cmmc") : undefined}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ShieldCheck size={22} />
                </div>
                <h2 className="mt-5 text-2xl font-bold text-slate-950">
                  {framework.name}
                </h2>
                <p className="mt-1 text-slate-500">{framework.status}</p>
                <div className="mt-5 flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>{framework.progress}% complete</span>
                  <ArrowRight size={18} />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}

function CanonicalCMMCRedirect({ frameworkWorkspace }) {
  const {
    activeFramework,
    isFrameworkSelected,
    selectFramework,
    setActiveFramework,
  } = frameworkWorkspace;

  useEffect(() => {
    if (activeFramework?.slug === "cmmc") return;
    if (isFrameworkSelected("cmmc")) {
      setActiveFramework("cmmc");
      return;
    }

    selectFramework("cmmc");
  }, [activeFramework?.slug, isFrameworkSelected, selectFramework, setActiveFramework]);

  if (activeFramework?.slug !== "cmmc") {
    return null;
  }

  return <Navigate to="/cmmc" replace />;
}

function OverviewRings({ data, workspaceData, selectedFramework }) {
  const isISO27001 = selectedFramework?.slug === "iso-27001";
  const riskProgress = progressFromRows(data.risks, (row) => isCompletedStatus(row, workspaceData));
  const controlProgress = progressFromRows(data.controls, (row) => isCompletedStatus(row, workspaceData));
  const testProgress = progressFromRows(data.tests, (row) => isCompletedStatus(row, workspaceData));
  const policyProgress = progressFromRows(data.policies, (row) => isApprovedStatus(row, workspaceData));
  const evidenceProgress = progressFromRows(
    [...data.controls, ...data.tests, ...data.policies],
    (row) => hasUploadedEvidence(row, workspaceData)
  );
  const auditReadiness = Math.round(
    (controlProgress + testProgress + evidenceProgress + policyProgress) / 4
  );

  const rings = isISO27001 ? [
    {
      label: "Risk Scenarios",
      value: riskProgress,
      caption: `${completedCount(data.risks, (row) => isCompletedStatus(row, workspaceData))}/${data.risks.length} completed`,
      tone: "#60a5fa",
    },
    {
      label: "Tests",
      value: testProgress,
      caption: `${completedCount(data.tests, (row) => isCompletedStatus(row, workspaceData))}/${data.tests.length} completed`,
      tone: "#22d3ee",
    },
    {
      label: "Controls",
      value: controlProgress,
      caption: `${completedCount(data.controls, (row) => isCompletedStatus(row, workspaceData))}/${data.controls.length} completed`,
      tone: "#3b82f6",
    },
    {
      label: "Audit",
      value: auditReadiness,
      caption: "Controls, tests, evidence",
      tone: "#facc15",
    },
  ] : [
    {
      label: "Risk Progress",
      value: riskProgress,
      caption: `${completedCount(data.risks, (row) => isCompletedStatus(row, workspaceData))}/${data.risks.length} completed`,
      tone: "#60a5fa",
    },
    {
      label: "Control Progress",
      value: controlProgress,
      caption: `${completedCount(data.controls, (row) => isCompletedStatus(row, workspaceData))}/${data.controls.length} completed`,
      tone: "#3b82f6",
    },
    {
      label: "Test Progress",
      value: testProgress,
      caption: `${completedCount(data.tests, (row) => isCompletedStatus(row, workspaceData))}/${data.tests.length} completed`,
      tone: "#22d3ee",
    },
    {
      label: "Policy Progress",
      value: policyProgress,
      caption: `${completedCount(data.policies, (row) => isApprovedStatus(row, workspaceData))}/${data.policies.length} approved`,
      tone: "#8b5cf6",
    },
    {
      label: "Audit Readiness",
      value: auditReadiness,
      caption: "Controls, tests, evidence, policies",
      tone: "#facc15",
    },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
          <span className="text-slate-500">⌄</span>
          Overview
        </button>
        <p className="ml-6 text-xs font-semibold text-slate-400">
          Organization progress from implementation status, evidence, and policy approval
        </p>
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 ${isISO27001 ? "xl:grid-cols-4" : "xl:grid-cols-5"}`}>
        {rings.map((ring) => (
          <div
            key={ring.label}
            className="flex flex-col items-center justify-center border-slate-100 py-2 xl:border-r xl:last:border-r-0"
          >
            <p className="mb-2 text-xs font-black text-slate-600">
              {ring.label}
            </p>
            <div
              className="grid h-24 w-24 place-items-center rounded-full"
              style={{
                background: `conic-gradient(${ring.tone} ${ring.value * 3.6}deg, #f1f5f9 0deg)`,
              }}
            >
              <div className="grid h-20 w-20 place-items-center rounded-full bg-white">
                <span className="text-xl font-black text-slate-950">
                  {ring.value}%
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              {ring.caption}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ImplementationTabs({ tabs = implementationTabs, activeTab, onTabChange }) {
  return (
    <div className="overflow-x-auto border-b border-slate-200 bg-transparent">
      <div className="flex min-w-max gap-6 px-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`border-b-2 px-0 py-3 text-sm font-black transition ${
              activeTab === tab
                ? "border-slate-950 text-slate-950"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExportMenu({ compact = false, data = emptyImplementationData }) {
  const options = [
    ["Export all", "all", [...data.risks, ...data.tests, ...data.controls, ...data.policies, ...data.populations]],
    ["Export tests", "tests", data.tests],
    ["Export controls", "controls", data.controls],
    ["Export risk scenarios", "risk-scenarios", data.risks],
    ["Export policies", "policies", data.policies],
    ["Export populations", "populations", data.populations],
  ];

  return (
    <details className="relative">
      <summary
        className={`inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 ${
          compact ? "h-11 px-3" : "px-4 py-2"
        }`}
      >
        <Download size={16} />
        Export
        {!compact && <ArrowRight size={15} />}
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
        {options.map(([label, fileName, rows]) => (
          <button
            key={fileName}
            type="button"
            onClick={() => downloadExcelFile(fileName, rows)}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {label}
          </button>
        ))}
      </div>
    </details>
  );
}

function TabPanel({ activeTab, selectedFramework, data, questionnaireResponses, workspaceData, onSelectWorkspaceItem }) {
  if (isCMMCFramework(selectedFramework)) {
    return <CMMCImplementationPanel activeTab={activeTab} />;
  }

  if (activeTab === "Controls") {
    return (
      <ControlsSection rows={data.controls} questionnaireResponses={questionnaireResponses} workspaceData={workspaceData} selectedFramework={selectedFramework} onSelectWorkspaceItem={onSelectWorkspaceItem} />
    );
  }

  if (activeTab === "Risk Scenarios") {
    return (
      <RiskScenariosSection rows={data.risks} questionnaireResponses={questionnaireResponses} workspaceData={workspaceData} selectedFramework={selectedFramework} onSelectWorkspaceItem={onSelectWorkspaceItem} />
    );
  }

  if (activeTab === "Tests") {
    return (
      <TestsSection rows={data.tests} questionnaireResponses={questionnaireResponses} workspaceData={workspaceData} selectedFramework={selectedFramework} onSelectWorkspaceItem={onSelectWorkspaceItem} />
    );
  }

  if (activeTab === "Mandatory Docs") {
    return (
      <MandatoryDocsSection rows={data.policies} workspaceData={workspaceData} selectedFramework={selectedFramework} onSelectWorkspaceItem={onSelectWorkspaceItem} />
    );
  }

  if (activeTab === "Policies") {
    return (
      <PoliciesSection rows={data.policies} questionnaireResponses={questionnaireResponses} workspaceData={workspaceData} selectedFramework={selectedFramework} onSelectWorkspaceItem={onSelectWorkspaceItem} />
    );
  }

  return (
    <PopulationSection rows={data.populations} questionnaireResponses={questionnaireResponses} workspaceData={workspaceData} selectedFramework={selectedFramework} onSelectWorkspaceItem={onSelectWorkspaceItem} />
  );
}

function CMMCImplementationPanel({ activeTab }) {
  if (activeTab === "Overview") {
    return <CMMCImplementationOverview />;
  }

  if (activeTab === "Domains") {
    return <CMMCDomainsPanel />;
  }

  if (activeTab === "Controls") {
    return <CMMCControlsPanel />;
  }

  if (activeTab === "Assessment Objectives") {
    return <CMMCAssessmentObjectivesPanel />;
  }

  if (activeTab === "Evidence") {
    return <CMMCEvidencePanel />;
  }

  if (activeTab === "Policies") {
    return <CMMCPoliciesPanel />;
  }

  if (activeTab === "SSP") {
    return <CMMCSSPPanel />;
  }

  if (activeTab === "POA&M") {
    return <CMMCPOAMPanel />;
  }

  if (activeTab === "Auditor") {
    return <CMMCAuditorPanel />;
  }

  if (activeTab === "Export") {
    return <CMMCExportCenterPanel />;
  }

  return null;
}

function CMMCImplementationOverview() {
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setCardsVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
          <ShieldCheck size={16} className="text-slate-500" />
          CMMC Overview
        </button>
        <p className="ml-6 text-xs font-semibold text-slate-400">
          Mock readiness signals for the CMMC implementation workspace
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cmmcOverviewMetrics.map((metric, index) => (
          <article
            key={metric.id}
            className={`flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4 text-center transition-all duration-500 ease-out ${
              cardsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
            style={{ transitionDelay: `${index * CMMC_CARD_STAGGER_MS}ms` }}
          >
            <p className="mb-2 text-xs font-black text-slate-600">
              {metric.title}
            </p>
            <CMMCProgressRing
              value={metric.value}
              size={CMMC_RING_SIZE}
              stroke={CMMC_RING_STROKE}
              progressColor={metric.color}
              trackColor={CMMC_RING_TRACK_COLOR}
              textColor={CMMC_RING_TEXT_COLOR}
              duration={CMMC_RING_DURATION_MS}
              label={`${metric.title}: ${metric.value}%`}
            />
            <p className="mt-2 text-xs font-semibold text-slate-400">
              {metric.caption}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CMMCDomainsPanel() {
  const [selectedDomainCode, setSelectedDomainCode] = useState(DEFAULT_CMMC_DOMAIN);
  const [cardsVisible, setCardsVisible] = useState(false);
  const domains = useMemo(
    () => cmmcDomains.map((domain) => getCMMCDomainDetails(domain)),
    []
  );
  const selectedDomain =
    domains.find((domain) => domain.shortCode === selectedDomainCode) || domains[0];

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setCardsVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
            <ShieldCheck size={16} className="text-slate-500" />
            Domains
          </button>
          <p className="ml-6 text-xs font-semibold text-slate-400">
            Review CMMC domain progress across controls, objectives, evidence, and policies
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {domains.map((domain, index) => (
            <CMMCDomainCard
              key={domain.shortCode}
              domain={domain}
              index={index}
              isSelected={selectedDomain.shortCode === domain.shortCode}
              isVisible={cardsVisible}
              onSelect={() => setSelectedDomainCode(domain.shortCode)}
            />
          ))}
        </div>
      </section>

      <CMMCDomainDetails key={selectedDomain.shortCode} domain={selectedDomain} />
    </div>
  );
}

function CMMCDomainCard({ domain, index, isSelected, isVisible, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-4 text-left shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected
          ? "border-blue-600/35 bg-blue-50 shadow-lg shadow-slate-900/5"
          : "border-slate-200 bg-[#fffdf8]/72 hover:border-blue-600/25"
      } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      style={{ transitionDelay: `${index * CMMC_CARD_STAGGER_MS}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Domain ID
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {domain.shortCode}
          </p>
        </div>
        <CMMCDomainStatusBadge status={domain.status} />
      </div>

      <h3 className="mt-3 text-lg font-black text-slate-900">
        {domain.name}
      </h3>
      <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-slate-500">
        {domain.description}
      </p>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Controls
          </p>
          <p className="mt-1 text-sm font-black text-slate-700">
            {domain.totalControls} Controls
          </p>
        </div>
        <p className="text-2xl font-black text-slate-900">
          {domain.progress}%
        </p>
      </div>

      <CMMCDomainProgressBar
        value={domain.progress}
        color={domain.color}
        isVisible={isVisible}
        className="mt-3"
      />
    </button>
  );
}

function CMMCDomainDetails({ domain }) {
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setDetailsVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out ${
        detailsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Domain Details
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {domain.shortCode} - {domain.name}
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
            {domain.description}
          </p>
        </div>
        <CMMCDomainStatusBadge status={domain.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <CMMCDomainDetailStat label="Progress" value={`${domain.progress}%`} />
        <CMMCDomainDetailStat label="Controls" value={domain.totalControls} />
        <CMMCDomainDetailStat label="Status" value={domain.status} />
        <CMMCDomainDetailStat label="Assessment Objectives" value={domain.totalObjectives} />
        <CMMCDomainDetailStat label="Evidence" value={domain.evidenceCount} />
        <CMMCDomainDetailStat label="Policies" value={domain.policyCount} />
      </div>

      <CMMCDomainProgressBar
        value={domain.progress}
        color={domain.color}
        isVisible={detailsVisible}
        className="mt-5"
      />

    </section>
  );
}

function CMMCDomainDetailStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-3">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function CMMCDomainProgressBar({ value, color, isVisible, className = "" }) {
  return (
    <div className={className}>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${isVisible ? value : 0}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function CMMCDomainStatusBadge({ status }) {
  const toneClass = getCMMCDomainStatusClass(status);

  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${toneClass}`}>
      {status}
    </span>
  );
}

function getCMMCDomainDetails(domain) {
  const mockData = cmmcDomainMockData[domain.shortCode] || {};

  return {
    ...domain,
    description: mockData.description || "CMMC domain readiness details are being prepared.",
    progress: mockData.progress ?? 0,
    status: mockData.status || "Not Started",
    evidenceCount: mockData.evidenceCount ?? 0,
    policyCount: mockData.policyCount ?? 0,
  };
}

function getCMMCDomainStatusClass(status) {
  if (status === "Ready") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Completed") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Approved") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Pending") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "Queued") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "Under Review") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "Failed") {
    return "bg-rose-50 text-rose-700";
  }

  if (status === "Rejected") {
    return "bg-rose-50 text-rose-700";
  }

  if (status === "Needs Review") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "Not Started") {
    return "bg-slate-100 text-slate-600";
  }

  if (status === "Draft") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-blue-50 text-blue-800";
}

function CMMCControlsPanel() {
  const [selectedControlId, setSelectedControlId] = useState(cmmcControlsMockData[0].id);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [cardsVisible, setCardsVisible] = useState(false);
  const controls = useMemo(
    () => cmmcControlsMockData.map((control) => getCMMCControlDetails(control)),
    []
  );
  const filteredControls = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return controls.filter((control) => {
      const matchesQuery =
        !normalizedQuery ||
        control.id.toLowerCase().includes(normalizedQuery) ||
        control.name.toLowerCase().includes(normalizedQuery) ||
        control.domainName.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "All" || control.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || control.priority === priorityFilter;

      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [controls, priorityFilter, query, statusFilter]);
  const selectedControl =
    controls.find((control) => control.id === selectedControlId) || controls[0];

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setCardsVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
            <ShieldCheck size={16} className="text-slate-500" />
            Controls
          </button>
          <p className="ml-6 text-xs font-semibold text-slate-400">
            Search and review mock CMMC controls by domain, status, and priority
          </p>
        </div>

        <CMMCControlFilters
          query={query}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          onQueryChange={setQuery}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
        />

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {filteredControls.map((control, index) => (
            <CMMCControlCard
              key={control.id}
              control={control}
              index={index}
              isSelected={selectedControl.id === control.id}
              isVisible={cardsVisible}
              onSelect={() => setSelectedControlId(control.id)}
            />
          ))}
        </div>

        {!filteredControls.length && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-[#fffdf8]/62 px-6 py-10 text-center">
            <p className="text-sm font-black text-slate-900">
              No controls found.
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Adjust the search or filters to review more CMMC controls.
            </p>
          </div>
        )}
      </section>

      <CMMCControlDetails key={selectedControl.id} control={selectedControl} />
    </div>
  );
}

function CMMCControlFilters({
  query,
  statusFilter,
  priorityFilter,
  onQueryChange,
  onStatusChange,
  onPriorityChange,
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px]">
      <label className="relative">
        <span className="sr-only">Search CMMC controls</span>
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search controls, names, or domains"
          className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600"
        />
      </label>

      <label>
        <span className="sr-only">Status filter</span>
        <select
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
        >
          {cmmcControlStatusFilters.map((status) => (
            <option key={status} value={status}>
              Status: {status}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">Priority filter</span>
        <select
          value={priorityFilter}
          onChange={(event) => onPriorityChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
        >
          {cmmcControlPriorityFilters.map((priority) => (
            <option key={priority} value={priority}>
              Priority: {priority}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CMMCControlCard({ control, index, isSelected, isVisible, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-4 text-left shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected
          ? "border-blue-600/35 bg-blue-50 shadow-lg shadow-slate-900/5"
          : "border-slate-200 bg-[#fffdf8]/72 hover:border-blue-600/25"
      } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      style={{ transitionDelay: `${index * CMMC_CARD_STAGGER_MS}ms` }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Control ID
          </p>
          <p className="mt-1 text-lg font-black text-blue-700">
            {control.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CMMCDomainStatusBadge status={control.status} />
          <CMMCControlPriorityBadge priority={control.priority} />
        </div>
      </div>

      <h3 className="mt-3 text-lg font-black text-slate-900">
        {control.name}
      </h3>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        Domain: {control.domainName}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <CMMCControlCardStat label="AO" value={control.objectives} />
        <CMMCControlCardStat label="Evidence" value={control.evidence} />
        <CMMCControlCardStat label="Policies" value={control.policies} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Progress
        </p>
        <p className="text-sm font-black text-slate-900">
          {control.progress}%
        </p>
      </div>
      <CMMCDomainProgressBar
        value={control.progress}
        color={control.domainColor}
        isVisible={isVisible}
        className="mt-2"
      />
    </button>
  );
}

function CMMCControlCardStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/72 p-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function CMMCControlDetails({ control }) {
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setDetailsVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out ${
        detailsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Control Details
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {control.id}
          </h2>
          <p className="mt-1 text-lg font-black text-slate-800">
            {control.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CMMCDomainStatusBadge status={control.status} />
          <CMMCControlPriorityBadge priority={control.priority} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Description
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {control.description}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Implementation Guidance
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {control.guidance}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <CMMCDomainDetailStat label="Status" value={control.status} />
        <CMMCDomainDetailStat label="Priority" value={control.priority} />
        <CMMCDomainDetailStat label="Progress" value={`${control.progress}%`} />
        <CMMCDomainDetailStat label="Assessment Objectives" value={control.objectives} />
        <CMMCDomainDetailStat label="Evidence" value={control.evidence} />
        <CMMCDomainDetailStat label="Policies" value={control.policies} />
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Mapped Domain
        </p>
        <p className="mt-2 text-sm font-black text-slate-900">
          {control.domainCode} - {control.domainName}
        </p>
      </div>

      <CMMCDomainProgressBar
        value={control.progress}
        color={control.domainColor}
        isVisible={detailsVisible}
        className="mt-5"
      />

    </section>
  );
}

function CMMCControlPriorityBadge({ priority }) {
  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${getCMMCControlPriorityClass(priority)}`}>
      {priority}
    </span>
  );
}

function getCMMCControlDetails(control) {
  const domain = cmmcDomains.find((item) => item.shortCode === control.domainCode);
  const domainName = domain?.name || "Unmapped Domain";
  const domainColor = domain?.color || "#9d6f38";

  return {
    ...control,
    domainName,
    domainColor,
    assessmentObjectives: getCMMCAssessmentObjectivesForControl({
      ...control,
      domainName,
      domainColor,
    }),
  };
}

function getCMMCControlPriorityClass(priority) {
  if (priority === "High") {
    return "bg-rose-50 text-rose-700";
  }

  if (priority === "Medium") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function CMMCAssessmentObjectivesPanel() {
  const firstControlId = cmmcControlsMockData[0].id;
  const [selectedControlId, setSelectedControlId] = useState(firstControlId);
  const [selectedObjectiveKey, setSelectedObjectiveKey] = useState(`${firstControlId}-AO-1`);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [listVisible, setListVisible] = useState(false);
  const controls = useMemo(
    () => cmmcControlsMockData.map((control) => getCMMCControlDetails(control)),
    []
  );
  const selectedControl =
    controls.find((control) => control.id === selectedControlId) || controls[0];
  const objectives = selectedControl.assessmentObjectives;
  const filteredObjectives = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return objectives.filter((objective) => {
      const matchesQuery =
        !normalizedQuery ||
        objective.id.toLowerCase().includes(normalizedQuery) ||
        objective.statement.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "All" || objective.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [objectives, query, statusFilter]);
  const selectedObjective =
    filteredObjectives.find((objective) => objective.key === selectedObjectiveKey) ||
    objectives.find((objective) => objective.key === selectedObjectiveKey) ||
    objectives[0];

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setListVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleControlChange = (controlId) => {
    setSelectedControlId(controlId);
    setSelectedObjectiveKey(`${controlId}-AO-1`);
    setQuery("");
    setStatusFilter("All");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
            <ShieldCheck size={16} className="text-slate-500" />
            Assessment Objectives
          </button>
          <p className="ml-6 text-xs font-semibold text-slate-400">
            Select a CMMC control and review its assessment objectives
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_190px]">
          <label>
            <span className="sr-only">Select CMMC control</span>
            <select
              value={selectedControlId}
              onChange={(event) => handleControlChange(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
            >
              {controls.map((control) => (
                <option key={control.id} value={control.id}>
                  {control.id} - {control.name}
                </option>
              ))}
            </select>
          </label>

          <label className="relative">
            <span className="sr-only">Search assessment objectives</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search AO ID or objective"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600"
            />
          </label>

          <label>
            <span className="sr-only">Assessment objective status filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
            >
              {cmmcControlStatusFilters.map((status) => (
                <option key={status} value={status}>
                  Status: {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Selected Control
          </p>
          <p className="mt-2 text-sm font-black text-blue-700">
            {selectedControl.id}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {selectedControl.name}
          </p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {filteredObjectives.map((objective, index) => (
            <CMMCAssessmentObjectiveCard
              key={objective.key}
              objective={objective}
              index={index}
              isSelected={selectedObjective.key === objective.key}
              isVisible={listVisible}
              onSelect={() => setSelectedObjectiveKey(objective.key)}
            />
          ))}
        </div>

        {!filteredObjectives.length && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-[#fffdf8]/62 px-6 py-10 text-center">
            <p className="text-sm font-black text-slate-900">
              No assessment objectives found.
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Adjust the search or status filter for this control.
            </p>
          </div>
        )}
      </section>

      <CMMCAssessmentObjectiveDetails key={selectedObjective.key} objective={selectedObjective} />
    </div>
  );
}

function CMMCAssessmentObjectiveCard({ objective, index, isSelected, isVisible, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-4 text-left shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected
          ? "border-blue-600/35 bg-blue-50 shadow-lg shadow-slate-900/5"
          : "border-slate-200 bg-[#fffdf8]/72 hover:border-blue-600/25"
      } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      style={{ transitionDelay: `${index * CMMC_CARD_STAGGER_MS}ms` }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            AO ID
          </p>
          <p className="mt-1 text-lg font-black text-blue-700">
            {objective.id}
          </p>
        </div>
        <CMMCDomainStatusBadge status={objective.status} />
      </div>

      <h3 className="mt-3 text-base font-black leading-6 text-slate-900">
        {objective.statement}
      </h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {objective.notes}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <CMMCControlCardStat label="Evidence" value={objective.evidenceCount} />
        <CMMCControlCardStat label="Progress" value={`${objective.progress}%`} />
      </div>

      <CMMCDomainProgressBar
        value={objective.progress}
        color={objective.domainColor}
        isVisible={isVisible}
        className="mt-3"
      />
    </button>
  );
}

function CMMCAssessmentObjectiveDetails({ objective }) {
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setDetailsVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out ${
        detailsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Assessment Objective Details
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {objective.id}
          </h2>
          <p className="mt-1 text-lg font-black text-slate-800">
            {objective.statement}
          </p>
        </div>
        <CMMCDomainStatusBadge status={objective.status} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Description
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {objective.description}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Implementation Guidance
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {objective.guidance}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <CMMCDomainDetailStat label="Status" value={objective.status} />
        <CMMCDomainDetailStat label="Progress" value={`${objective.progress}%`} />
        <CMMCDomainDetailStat label="Mapped Control" value={objective.controlId} />
        <CMMCDomainDetailStat label="Evidence" value={objective.evidenceCount} />
        <CMMCDomainDetailStat label="Policies" value={objective.policyCount} />
        <CMMCDomainDetailStat label="Domain" value={objective.domainCode} />
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Mock Notes
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {objective.notes}
        </p>
      </div>

      <CMMCDomainProgressBar
        value={objective.progress}
        color={objective.domainColor}
        isVisible={detailsVisible}
        className="mt-5"
      />

    </section>
  );
}

function getCMMCAssessmentObjectivesForControl(control) {
  return Array.from({ length: control.objectives }, (_, index) => {
    const objectiveNumber = index + 1;
    const progress = getCMMCAssessmentObjectiveProgress(control, index);
    const status = getCMMCAssessmentObjectiveStatus(progress);
    const evidenceCount = getCMMCAssessmentObjectiveEvidenceCount(control, progress, index);
    const template = getCMMCAssessmentObjectiveTemplate(control, objectiveNumber);

    return {
      key: `${control.id}-AO-${objectiveNumber}`,
      id: `AO-${objectiveNumber}`,
      controlId: control.id,
      controlName: control.name,
      domainCode: control.domainCode,
      domainColor: control.domainColor,
      statement: template.statement,
      description: template.description,
      guidance: template.guidance,
      notes: template.notes,
      status,
      progress,
      evidenceCount,
      policyCount: objectiveNumber === 1 ? control.policies : Math.max(0, control.policies - 1),
    };
  });
}

function getCMMCAssessmentObjectiveTemplate(control, objectiveNumber) {
  const normalizedControlName = control.name.replace(/\.$/, "").toLowerCase();
  const templates = [
    {
      statement: `Verify ${normalizedControlName}.`,
      description: `Confirm the organization has implemented ${control.name.toLowerCase()}`,
      guidance: control.guidance,
      notes: `Review current implementation evidence for ${control.id} and confirm ownership is documented.`,
    },
    {
      statement: `Review evidence supporting ${control.id}.`,
      description: `Assess whether available evidence is sufficient to support the control outcome for ${control.domainName}.`,
      guidance: "Confirm screenshots, exports, tickets, or approvals are current and mapped to the control intent.",
      notes: "Evidence is partially mapped and should be validated against assessment expectations.",
    },
    {
      statement: `Validate operating consistency for ${control.domainName}.`,
      description: `Determine whether the control is performed consistently across the scoped environment.`,
      guidance: "Compare policy expectations, operating records, and sample evidence for alignment.",
      notes: "Sampling approach should be confirmed before final readiness review.",
    },
    {
      statement: `Confirm remediation tracking for ${control.id}.`,
      description: "Review open gaps, assigned owners, due dates, and management visibility for remediation work.",
      guidance: "Use POA&M entries, risk notes, and reviewer comments to verify follow-through.",
      notes: "Remediation status should remain visible until evidence is complete.",
    },
  ];

  return templates[(objectiveNumber - 1) % templates.length];
}

function getCMMCAssessmentObjectiveProgress(control, index) {
  const offsets = [16, -4, 8, -18];
  const value = control.progress + offsets[index % offsets.length] - index * 3;

  if (control.status === "Completed") {
    return Math.min(100, Math.max(86, value));
  }

  if (control.status === "Not Started") {
    return Math.min(34, Math.max(0, value));
  }

  return Math.min(84, Math.max(12, value));
}

function getCMMCAssessmentObjectiveStatus(progress) {
  if (progress >= 85) {
    return "Completed";
  }

  if (progress > 0) {
    return "In Progress";
  }

  return "Not Started";
}

function getCMMCAssessmentObjectiveEvidenceCount(control, progress, index) {
  if (!control.evidence || progress === 0) {
    return 0;
  }

  if (progress >= 85) {
    return Math.min(control.evidence, 2 + (index % 2));
  }

  if (progress >= 35) {
    return Math.min(control.evidence, 1 + (index % 2));
  }

  return Math.min(control.evidence, index === 0 ? 1 : 0);
}

function CMMCEvidencePanel() {
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("EV-001");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [listVisible, setListVisible] = useState(false);
  const controls = useMemo(
    () => cmmcControlsMockData.map((control) => getCMMCControlDetails(control)),
    []
  );
  const evidenceItems = useMemo(() => getCMMCEvidenceItemsFromControls(controls), [controls]);
  const filteredEvidence = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return evidenceItems.filter((evidence) => {
      const matchesQuery =
        !normalizedQuery ||
        evidence.id.toLowerCase().includes(normalizedQuery) ||
        evidence.name.toLowerCase().includes(normalizedQuery) ||
        evidence.controlId.toLowerCase().includes(normalizedQuery) ||
        evidence.objectiveId.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "All" || evidence.status === statusFilter;
      const matchesType = typeFilter === "All" || evidence.type === typeFilter;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [evidenceItems, query, statusFilter, typeFilter]);
  const selectedEvidence =
    evidenceItems.find((evidence) => evidence.id === selectedEvidenceId) || evidenceItems[0];

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setListVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
            <ShieldCheck size={16} className="text-slate-500" />
            Evidence
          </button>
          <p className="ml-6 text-xs font-semibold text-slate-400">
            Review mock evidence mapped to CMMC controls and assessment objectives
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px]">
          <label className="relative">
            <span className="sr-only">Search CMMC evidence</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search evidence, controls, or AO"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600"
            />
          </label>

          <label>
            <span className="sr-only">Evidence status filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
            >
              {cmmcEvidenceStatusFilters.map((status) => (
                <option key={status} value={status}>
                  Status: {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Evidence type filter</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
            >
              {cmmcEvidenceTypeFilters.map((type) => (
                <option key={type} value={type}>
                  Type: {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {filteredEvidence.map((evidence, index) => (
            <CMMCEvidenceCard
              key={evidence.id}
              evidence={evidence}
              index={index}
              isSelected={selectedEvidence.id === evidence.id}
              isVisible={listVisible}
              onSelect={() => setSelectedEvidenceId(evidence.id)}
            />
          ))}
        </div>

        {!filteredEvidence.length && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-[#fffdf8]/62 px-6 py-10 text-center">
            <p className="text-sm font-black text-slate-900">
              No evidence found.
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Adjust the search or filters to review more mapped evidence.
            </p>
          </div>
        )}
      </section>

      <CMMCEvidenceDetails key={selectedEvidence.id} evidence={selectedEvidence} />
    </div>
  );
}

function CMMCEvidenceCard({ evidence, index, isSelected, isVisible, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-4 text-left shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected
          ? "border-blue-600/35 bg-blue-50 shadow-lg shadow-slate-900/5"
          : "border-slate-200 bg-[#fffdf8]/72 hover:border-blue-600/25"
      } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      style={{ transitionDelay: `${index * CMMC_CARD_STAGGER_MS}ms` }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Evidence ID
          </p>
          <p className="mt-1 text-lg font-black text-blue-700">
            {evidence.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CMMCDomainStatusBadge status={evidence.status} />
          <CMMCEvidenceTypeBadge type={evidence.type} />
        </div>
      </div>

      <h3 className="mt-3 text-lg font-black text-slate-900">
        {evidence.name}
      </h3>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <CMMCControlCardStat label="Mapped Control" value={evidence.controlId} />
        <CMMCControlCardStat label="Mapped AO" value={evidence.objectiveId} />
        <CMMCControlCardStat label="Updated" value={evidence.lastUpdated} />
        <CMMCControlCardStat label="Owner" value={evidence.owner} />
      </div>
    </button>
  );
}

function CMMCEvidenceDetails({ evidence }) {
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setDetailsVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out ${
        detailsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Evidence Details
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {evidence.id}
          </h2>
          <p className="mt-1 text-lg font-black text-slate-800">
            {evidence.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CMMCDomainStatusBadge status={evidence.status} />
          <CMMCEvidenceTypeBadge type={evidence.type} />
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Description
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {evidence.description}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CMMCDomainDetailStat label="Evidence Type" value={evidence.type} />
        <CMMCDomainDetailStat label="Status" value={evidence.status} />
        <CMMCDomainDetailStat label="Owner" value={evidence.owner} />
        <CMMCDomainDetailStat label="Last Updated" value={evidence.lastUpdated} />
        <CMMCDomainDetailStat label="Mapped Control" value={evidence.controlId} />
        <CMMCDomainDetailStat label="Mapped AO" value={evidence.objectiveId} />
        <CMMCDomainDetailStat label="Mock File" value={evidence.fileName} />
        <CMMCDomainDetailStat label="Domain" value={evidence.domainCode} />
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Reviewer Notes
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {evidence.reviewerNotes}
        </p>
      </div>

    </section>
  );
}

function CMMCEvidenceTypeBadge({ type }) {
  return (
    <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
      {type}
    </span>
  );
}

function getCMMCEvidenceItemsFromControls(controls) {
  let evidenceIndex = 0;

  return controls.flatMap((control) =>
    control.assessmentObjectives.map((objective, objectiveIndex) => {
      evidenceIndex += 1;
      const type = getCMMCEvidenceType(evidenceIndex);
      const status = getCMMCEvidenceStatus(objective.status, evidenceIndex);
      const name = getCMMCEvidenceName(type, control, objectiveIndex);
      const id = `EV-${String(evidenceIndex).padStart(3, "0")}`;

      return {
        id,
        name,
        description: `${type} evidence mapped to ${objective.id} for ${control.id}.`,
        type,
        status,
        owner: getCMMCEvidenceOwner(evidenceIndex),
        lastUpdated: getCMMCEvidenceUpdatedDate(evidenceIndex),
        controlId: control.id,
        controlName: control.name,
        objectiveId: objective.id,
        objectiveStatement: objective.statement,
        domainCode: control.domainCode,
        fileName: getCMMCEvidenceFileName(id, name, type),
        reviewerNotes: getCMMCEvidenceReviewerNotes(status, objective),
      };
    })
  );
}

function getCMMCEvidenceType(index) {
  const evidenceTypes = ["Screenshot", "Policy", "Configuration", "Log", "Report", "Document"];
  return evidenceTypes[(index - 1) % evidenceTypes.length];
}

function getCMMCEvidenceStatus(objectiveStatus, index) {
  if (objectiveStatus === "Completed") {
    return "Approved";
  }

  if (index % 7 === 0) {
    return "Rejected";
  }

  return "Pending";
}

function getCMMCEvidenceName(type, control, objectiveIndex) {
  if (control.id === "AC.L1-3.1.1" && objectiveIndex === 0) {
    return "Active Directory User Export";
  }

  const namesByType = {
    Screenshot: `${control.domainCode} Control Screenshot`,
    Policy: `${control.domainCode} Policy Excerpt`,
    Configuration: `${control.id} Configuration Export`,
    Log: `${control.domainCode} Review Log`,
    Report: `${control.domainCode} Assessment Report`,
    Document: `${control.domainCode} Procedure Document`,
  };

  return namesByType[type] || `${control.domainCode} Evidence Artifact`;
}

function getCMMCEvidenceOwner(index) {
  const owners = ["Security", "Compliance", "IT Operations", "GRC"];
  return owners[(index - 1) % owners.length];
}

function getCMMCEvidenceUpdatedDate(index) {
  const day = String(4 + (index % 21)).padStart(2, "0");
  return `2026-06-${day}`;
}

function getCMMCEvidenceFileName(id, name, type) {
  const extensionByType = {
    Screenshot: "png",
    Policy: "pdf",
    Configuration: "csv",
    Log: "log",
    Report: "xlsx",
    Document: "docx",
  };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return `${id.toLowerCase()}-${slug}.${extensionByType[type] || "pdf"}`;
}

function getCMMCEvidenceReviewerNotes(status, objective) {
  if (status === "Approved") {
    return `Reviewer accepted this artifact for ${objective.id}; retain it for assessment package assembly.`;
  }

  if (status === "Rejected") {
    return `Reviewer requested a clearer artifact for ${objective.id} before this evidence can be accepted.`;
  }

  return `Reviewer has not completed final review for ${objective.id}; confirm freshness and ownership before submission.`;
}

function CMMCPoliciesPanel() {
  const [selectedPolicyId, setSelectedPolicyId] = useState(cmmcPoliciesMockData[0].id);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [listVisible, setListVisible] = useState(false);
  const controls = useMemo(
    () => cmmcControlsMockData.map((control) => getCMMCControlDetails(control)),
    []
  );
  const policies = useMemo(
    () => cmmcPoliciesMockData.map((policy) => getCMMCPolicyDetails(policy, controls)),
    [controls]
  );
  const filteredPolicies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return policies.filter((policy) => {
      const matchesQuery =
        !normalizedQuery ||
        policy.id.toLowerCase().includes(normalizedQuery) ||
        policy.name.toLowerCase().includes(normalizedQuery) ||
        policy.category.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "All" || policy.status === statusFilter;
      const matchesCategory = categoryFilter === "All" || policy.category === categoryFilter;

      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, policies, query, statusFilter]);
  const selectedPolicy =
    policies.find((policy) => policy.id === selectedPolicyId) || policies[0];

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setListVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
            <ShieldCheck size={16} className="text-slate-500" />
            Policies
          </button>
          <p className="ml-6 text-xs font-semibold text-slate-400">
            Review mock CMMC policies mapped to controls and domains
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_230px]">
          <label className="relative">
            <span className="sr-only">Search CMMC policies</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search policy ID, name, or category"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600"
            />
          </label>

          <label>
            <span className="sr-only">Policy status filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
            >
              {cmmcPolicyStatusFilters.map((status) => (
                <option key={status} value={status}>
                  Status: {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Policy category filter</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
            >
              {cmmcPolicyCategoryFilters.map((category) => (
                <option key={category} value={category}>
                  Category: {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {filteredPolicies.map((policy, index) => (
            <CMMCPolicyCard
              key={policy.id}
              policy={policy}
              index={index}
              isSelected={selectedPolicy.id === policy.id}
              isVisible={listVisible}
              onSelect={() => setSelectedPolicyId(policy.id)}
            />
          ))}
        </div>

        {!filteredPolicies.length && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-[#fffdf8]/62 px-6 py-10 text-center">
            <p className="text-sm font-black text-slate-900">
              No policies found.
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Adjust the search or filters to review more CMMC policies.
            </p>
          </div>
        )}
      </section>

      <CMMCPolicyDetails key={selectedPolicy.id} policy={selectedPolicy} />
    </div>
  );
}

function CMMCPolicyCard({ policy, index, isSelected, isVisible, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-4 text-left shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected
          ? "border-blue-600/35 bg-blue-50 shadow-lg shadow-slate-900/5"
          : "border-slate-200 bg-[#fffdf8]/72 hover:border-blue-600/25"
      } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      style={{ transitionDelay: `${index * CMMC_CARD_STAGGER_MS}ms` }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Policy ID
          </p>
          <p className="mt-1 text-lg font-black text-blue-700">
            {policy.id}
          </p>
        </div>
        <CMMCDomainStatusBadge status={policy.status} />
      </div>

      <h3 className="mt-3 text-lg font-black text-slate-900">
        {policy.name}
      </h3>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        Category: {policy.category}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CMMCControlCardStat label="Version" value={policy.version} />
        <CMMCControlCardStat label="Owner" value={policy.owner} />
        <CMMCControlCardStat label="Updated" value={policy.lastUpdated} />
        <CMMCControlCardStat label="Mapped Controls" value={policy.mappedControls.length} />
      </div>
    </button>
  );
}

function CMMCPolicyDetails({ policy }) {
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setDetailsVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out ${
        detailsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Policy Details
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {policy.id}
          </h2>
          <p className="mt-1 text-lg font-black text-slate-800">
            {policy.name}
          </p>
        </div>
        <CMMCDomainStatusBadge status={policy.status} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <CMMCPolicyNarrativeBlock title="Description" body={policy.description} />
        <CMMCPolicyNarrativeBlock title="Purpose" body={policy.purpose} />
        <CMMCPolicyNarrativeBlock title="Scope" body={policy.scope} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <CMMCDomainDetailStat label="Owner" value={policy.owner} />
        <CMMCDomainDetailStat label="Version" value={policy.version} />
        <CMMCDomainDetailStat label="Approval Status" value={policy.status} />
        <CMMCDomainDetailStat label="Mapped Controls" value={policy.mappedControls.length} />
        <CMMCDomainDetailStat label="Related Domains" value={policy.relatedDomains.length} />
        <CMMCDomainDetailStat label="Review Date" value={policy.reviewDate} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Mapped Controls
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {policy.mappedControls.map((control) => (
              <span
                key={control.id}
                className="rounded-lg border border-blue-600/20 bg-blue-50 px-2.5 py-1.5 text-xs font-black text-blue-800"
              >
                {control.id}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Related Domains
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {policy.relatedDomains.map((domain) => (
              <span
                key={domain.shortCode}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700"
              >
                {domain.shortCode} - {domain.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Mock Notes
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {policy.notes}
        </p>
      </div>
    </section>
  );
}

function CMMCPolicyNarrativeBlock({ title, body }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
        {body}
      </p>
    </div>
  );
}

function getCMMCPolicyDetails(policy, controls) {
  const mappedControls = controls.filter((control) => policy.domainCodes.includes(control.domainCode));
  const relatedDomains = cmmcDomains.filter((domain) => policy.domainCodes.includes(domain.shortCode));

  return {
    ...policy,
    mappedControls,
    relatedDomains,
  };
}

function CMMCPOAMPanel() {
  const [selectedFindingId, setSelectedFindingId] = useState("POAM-001");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [tableVisible, setTableVisible] = useState(false);
  const controls = useMemo(
    () => cmmcControlsMockData.map((control) => getCMMCControlDetails(control)),
    []
  );
  const evidenceItems = useMemo(() => getCMMCEvidenceItemsFromControls(controls), [controls]);
  const policies = useMemo(
    () => cmmcPoliciesMockData.map((policy) => getCMMCPolicyDetails(policy, controls)),
    [controls]
  );
  const findings = useMemo(
    () => getCMMCPOAMFindings(controls, evidenceItems, policies),
    [controls, evidenceItems, policies]
  );
  const filteredFindings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return findings.filter((finding) => {
      const matchesQuery =
        !normalizedQuery ||
        finding.id.toLowerCase().includes(normalizedQuery) ||
        finding.title.toLowerCase().includes(normalizedQuery) ||
        finding.controlId.toLowerCase().includes(normalizedQuery) ||
        finding.owner.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "All" || finding.status === statusFilter;
      const matchesRisk = riskFilter === "All" || finding.riskLevel === riskFilter;

      return matchesQuery && matchesStatus && matchesRisk;
    });
  }, [findings, query, riskFilter, statusFilter]);
  const selectedFinding =
    findings.find((finding) => finding.id === selectedFindingId) || findings[0];

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setTableVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
            <ShieldCheck size={16} className="text-slate-500" />
            POA&amp;M
          </button>
          <p className="ml-6 text-xs font-semibold text-slate-400">
            Track mock remediation findings generated from incomplete CMMC controls
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px]">
          <label className="relative">
            <span className="sr-only">Search CMMC POA&amp;M findings</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search finding, title, control, or owner"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600"
            />
          </label>

          <label>
            <span className="sr-only">POA&amp;M status filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
            >
              {cmmcPOAMStatusFilters.map((status) => (
                <option key={status} value={status}>
                  Status: {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">POA&amp;M risk filter</span>
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
            >
              {cmmcPOAMRiskFilters.map((risk) => (
                <option key={risk} value={risk}>
                  Risk: {risk}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          className={`mt-4 overflow-x-auto rounded-lg border border-slate-200 transition-all duration-500 ease-out ${
            tableVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <table className="min-w-[1020px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50/90 text-xs font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Finding ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Mapped Control</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Target Date</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredFindings.map((finding) => (
                <CMMCPOAMTableRow
                  key={finding.id}
                  finding={finding}
                  isSelected={selectedFinding.id === finding.id}
                  onSelect={() => setSelectedFindingId(finding.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {!filteredFindings.length && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-[#fffdf8]/62 px-6 py-10 text-center">
            <p className="text-sm font-black text-slate-900">
              No POA&amp;M findings found.
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Adjust the search or filters to review more remediation items.
            </p>
          </div>
        )}
      </section>

      <CMMCPOAMDetails key={selectedFinding.id} finding={selectedFinding} />
    </div>
  );
}

function CMMCPOAMTableRow({ finding, isSelected, onSelect }) {
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition hover:bg-blue-50/50 ${
        isSelected ? "bg-blue-50" : ""
      }`}
    >
      <td className="px-4 py-3 align-top font-black text-blue-700">
        {finding.id}
      </td>
      <td className="px-4 py-3 align-top font-semibold text-slate-700">
        {finding.title}
      </td>
      <td className="px-4 py-3 align-top font-black text-slate-700">
        {finding.controlId}
      </td>
      <td className="px-4 py-3 align-top">
        <CMMCControlPriorityBadge priority={finding.priority} />
      </td>
      <td className="px-4 py-3 align-top">
        <CMMCDomainStatusBadge status={finding.status} />
      </td>
      <td className="px-4 py-3 align-top font-semibold text-slate-600">
        {finding.owner}
      </td>
      <td className="px-4 py-3 align-top font-semibold text-slate-600">
        {finding.targetDate}
      </td>
      <td className="px-4 py-3 align-top">
        <CMMCControlPriorityBadge priority={finding.riskLevel} />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="w-32">
          <div className="mb-1 text-xs font-black text-slate-600">
            {finding.progress}%
          </div>
          <CMMCDomainProgressBar
            value={finding.progress}
            color={finding.domainColor}
            isVisible
          />
        </div>
      </td>
    </tr>
  );
}

function CMMCPOAMDetails({ finding }) {
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setDetailsVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out ${
        detailsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            POA&amp;M Finding
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {finding.id}
          </h2>
          <p className="mt-1 text-lg font-black text-slate-800">
            {finding.title}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CMMCDomainStatusBadge status={finding.status} />
          <CMMCControlPriorityBadge priority={finding.riskLevel} />
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Description
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {finding.description}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <CMMCDomainDetailStat label="Mapped Control" value={finding.controlId} />
        <CMMCDomainDetailStat label="Mapped Domain" value={`${finding.domainCode} - ${finding.domainName}`} />
        <CMMCDomainDetailStat label="Owner" value={finding.owner} />
        <CMMCDomainDetailStat label="Target Date" value={finding.targetDate} />
        <CMMCDomainDetailStat label="Current Status" value={finding.status} />
        <CMMCDomainDetailStat label="Risk Rating" value={finding.riskLevel} />
      </div>

      <CMMCDomainProgressBar
        value={finding.progress}
        color={finding.domainColor}
        isVisible={detailsVisible}
        className="mt-5"
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <CMMCPOAMDetailBlock
          title="Related Assessment Objectives"
          items={finding.relatedObjectives.map((objective) => `${objective.id}: ${objective.statement}`)}
        />
        <CMMCPOAMDetailBlock
          title="Evidence Summary"
          items={finding.evidenceItems.length ? finding.evidenceItems.map((evidence) => `${evidence.id}: ${evidence.status}`) : ["No mapped evidence yet"]}
        />
        <CMMCPOAMDetailBlock
          title="Policy References"
          items={finding.policyReferences.length ? finding.policyReferences.map((policy) => `${policy.id}: ${policy.name}`) : ["No mapped policy reference yet"]}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <CMMCPolicyNarrativeBlock title="Recommended Remediation" body={finding.recommendedRemediation} />
        <CMMCPolicyNarrativeBlock title="Dependencies" body={finding.dependencies} />
      </div>

      <div className="mt-5 rounded-lg border border-blue-600/20 bg-blue-50 px-4 py-3">
        <p className="text-sm font-black text-blue-800">
          Auditor Workspace will consume these findings during assessment.
        </p>
      </div>
    </section>
  );
}

function CMMCPOAMDetailBlock({ title, items }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm font-semibold leading-6 text-slate-600">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function getCMMCPOAMFindings(controls, evidenceItems, policies) {
  return controls
    .filter((control) => control.progress < 90 || control.status !== "Completed")
    .map((control, index) => {
      const relatedObjectives = control.assessmentObjectives.filter((objective) => objective.progress < 85);
      const controlEvidence = evidenceItems.filter((evidence) => evidence.controlId === control.id);
      const policyReferences = policies.filter((policy) =>
        policy.mappedControls.some((mappedControl) => mappedControl.id === control.id)
      );

      return {
        id: `POAM-${String(index + 1).padStart(3, "0")}`,
        title: getCMMCPOAMTitle(control),
        description: `Remediate readiness gaps for ${control.id} and confirm operating evidence supports assessment expectations.`,
        controlId: control.id,
        controlName: control.name,
        domainCode: control.domainCode,
        domainName: control.domainName,
        domainColor: control.domainColor,
        priority: control.priority,
        status: getCMMCPOAMStatus(control),
        owner: getCMMCPOAMOwner(control),
        targetDate: getCMMCPOAMTargetDate(index),
        riskLevel: getCMMCPOAMRiskLevel(control),
        progress: control.progress,
        relatedObjectives: relatedObjectives.length ? relatedObjectives : control.assessmentObjectives.slice(0, 1),
        evidenceItems: controlEvidence,
        policyReferences,
        recommendedRemediation: getCMMCPOAMRemediation(control),
        dependencies: getCMMCPOAMDependencies(controlEvidence, policyReferences),
      };
    });
}

function getCMMCPOAMTitle(control) {
  if (control.status === "Not Started") {
    return `Start implementation for ${control.id}`;
  }

  if (control.status === "Completed") {
    return `Finalize validation evidence for ${control.id}`;
  }

  return `Complete implementation for ${control.id}`;
}

function getCMMCPOAMStatus(control) {
  if (control.progress >= 80) {
    return "Completed";
  }

  if (control.progress > 20) {
    return "In Progress";
  }

  return "Open";
}

function getCMMCPOAMOwner(control) {
  const ownersByDomain = {
    AC: "Security",
    IA: "IT Operations",
    MP: "Compliance",
    PE: "Facilities",
    RA: "GRC",
    CA: "Compliance",
    SC: "Engineering",
    SI: "Security",
    IR: "Security",
    AT: "HR",
  };

  return ownersByDomain[control.domainCode] || "Compliance";
}

function getCMMCPOAMTargetDate(index) {
  const day = String(8 + (index * 3) % 20).padStart(2, "0");
  return `2026-08-${day}`;
}

function getCMMCPOAMRiskLevel(control) {
  if (control.priority === "High" || control.progress < 30) {
    return "High";
  }

  if (control.priority === "Medium" || control.progress < 65) {
    return "Medium";
  }

  return "Low";
}

function getCMMCPOAMRemediation(control) {
  return `${control.guidance} Confirm control owner sign-off and update mapped assessment objectives before readiness review.`;
}

function getCMMCPOAMDependencies(evidenceItems, policyReferences) {
  const evidenceDependency = evidenceItems.some((evidence) => evidence.status !== "Approved")
    ? "pending evidence approval"
    : "approved evidence package";
  const policyDependency = policyReferences.some((policy) => policy.status !== "Approved")
    ? "policy approval"
    : "approved policy references";

  return `Depends on ${evidenceDependency} and ${policyDependency}.`;
}

const cmmcAuditorChecklistStatuses = ["Open", "In Progress", "Needs Review", "Completed"];

const cmmcAuditorReviewActions = [
  { label: "Approve", status: "Approved" },
  { label: "Needs Review", status: "Needs Review" },
  { label: "Reject", status: "Rejected" },
];

function CMMCAuditorPanel() {
  const [selectedFindingId, setSelectedFindingId] = useState("POAM-001");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [checklistOverrides, setChecklistOverrides] = useState({});
  const [reviewStatuses, setReviewStatuses] = useState({});
  const [pageVisible, setPageVisible] = useState(false);
  const controls = useMemo(
    () => cmmcControlsMockData.map((control) => getCMMCControlDetails(control)),
    []
  );
  const evidenceItems = useMemo(() => getCMMCEvidenceItemsFromControls(controls), [controls]);
  const policies = useMemo(
    () => cmmcPoliciesMockData.map((policy) => getCMMCPolicyDetails(policy, controls)),
    [controls]
  );
  const sspSummary = useMemo(() => getCMMCSSPComplianceSummary(controls), [controls]);
  const findings = useMemo(
    () => getCMMCPOAMFindings(controls, evidenceItems, policies),
    [controls, evidenceItems, policies]
  );
  const auditSummary = useMemo(
    () => getCMMCAuditorSummary(controls, evidenceItems, findings, sspSummary),
    [controls, evidenceItems, findings, sspSummary]
  );
  const ownerOptions = useMemo(
    () => ["All", ...new Set(findings.map((finding) => finding.owner))],
    [findings]
  );
  const checklistItems = useMemo(
    () =>
      getCMMCAuditorChecklistItems(auditSummary).map((item) => ({
        ...item,
        ...(checklistOverrides[item.id] || {}),
      })),
    [auditSummary, checklistOverrides]
  );
  const filteredFindings = useMemo(() => {
    return findings.filter((finding) => {
      const matchesStatus = statusFilter === "All" || finding.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || finding.priority === priorityFilter;
      const matchesOwner = ownerFilter === "All" || finding.owner === ownerFilter;

      return matchesStatus && matchesPriority && matchesOwner;
    });
  }, [findings, ownerFilter, priorityFilter, statusFilter]);
  const selectedFinding =
    findings.find((finding) => finding.id === selectedFindingId) || findings[0];
  const selectedReviewStatus = selectedFinding
    ? reviewStatuses[selectedFinding.id] || getCMMCAuditorDefaultReviewStatus(selectedFinding)
    : "Needs Review";

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setPageVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  function handleChecklistStatusChange(itemId, status) {
    setChecklistOverrides((currentOverrides) => ({
      ...currentOverrides,
      [itemId]: {
        status,
        completion: getCMMCAuditorChecklistCompletion(status),
      },
    }));
  }

  function handleReviewStatusChange(status) {
    if (!selectedFinding) {
      return;
    }

    setReviewStatuses((currentStatuses) => ({
      ...currentStatuses,
      [selectedFinding.id]: status,
    }));
  }

  return (
    <div
      className={`space-y-4 transition-all duration-500 ease-out ${
        pageVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-blue-700">
              Auditor Workspace
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              CMMC Audit Readiness
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Mock auditor view combining domains, controls, assessment objectives, evidence, policies, SSP readiness, and POA&amp;M findings.
            </p>
          </div>

          <div className="grid place-items-center rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
            <CMMCProgressRing
              value={auditSummary.overallReadiness}
              size={CMMC_AUDITOR_RING_SIZE}
              stroke={CMMC_AUDITOR_RING_STROKE}
              progressColor="#9d6f38"
              trackColor={CMMC_RING_TRACK_COLOR}
              textColor={CMMC_RING_TEXT_COLOR}
              duration={CMMC_RING_DURATION_MS}
              label={`Audit readiness: ${auditSummary.overallReadiness}%`}
            />
            <p className="mt-2 text-xs font-black uppercase tracking-widest text-slate-400">
              Audit Readiness
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <CMMCSummaryCard label="Overall Readiness" value={`${auditSummary.overallReadiness}%`} />
          <CMMCSummaryCard label="Domains Reviewed" value={`${auditSummary.domainsReviewed} / ${auditSummary.totalDomains}`} />
          <CMMCSummaryCard label="Controls Ready" value={`${auditSummary.controlsReady} / ${auditSummary.totalControls}`} />
          <CMMCSummaryCard label="Evidence Approved" value={`${auditSummary.evidenceApproved} / ${auditSummary.totalEvidence}`} />
          <CMMCSummaryCard label="Open Findings" value={auditSummary.openFindings} />
          <CMMCSummaryCard label="POA&M Remaining" value={auditSummary.poamRemaining} />
        </div>
      </section>

      <CMMCAuditorChecklist
        items={checklistItems}
        onStatusChange={handleChecklistStatusChange}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
              <ShieldCheck size={16} className="text-slate-500" />
              Auditor Findings
            </button>
            <p className="ml-6 text-xs font-semibold text-slate-400">
              Findings are generated from the existing CMMC POA&amp;M items
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[560px]">
            <label>
              <span className="sr-only">Auditor finding status filter</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
              >
                {cmmcPOAMStatusFilters.map((status) => (
                  <option key={status} value={status}>
                    Status: {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Auditor finding priority filter</span>
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
              >
                {cmmcControlPriorityFilters.map((priority) => (
                  <option key={priority} value={priority}>
                    Priority: {priority}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Auditor finding owner filter</span>
              <select
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
              >
                {ownerOptions.map((owner) => (
                  <option key={owner} value={owner}>
                    Owner: {owner}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {filteredFindings.map((finding) => (
            <CMMCAuditorFindingCard
              key={finding.id}
              finding={finding}
              isSelected={selectedFinding.id === finding.id}
              onSelect={() => setSelectedFindingId(finding.id)}
            />
          ))}
        </div>

        {!filteredFindings.length && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-[#fffdf8]/62 px-6 py-10 text-center">
            <p className="text-sm font-black text-slate-900">
              No auditor findings found.
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Adjust the filters to review more POA&amp;M findings.
            </p>
          </div>
        )}
      </section>

      {selectedFinding && (
        <CMMCAuditorReviewPanel
          key={selectedFinding.id}
          finding={selectedFinding}
          reviewStatus={selectedReviewStatus}
          onReviewStatusChange={handleReviewStatusChange}
        />
      )}
    </div>
  );
}

function CMMCSummaryCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function CMMCAuditorChecklist({ items, onStatusChange }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
          <ShieldCheck size={16} className="text-slate-500" />
          Audit Checklist
        </button>
        <p className="ml-6 text-xs font-semibold text-slate-400">
          Mock checklist for auditor review preparation and handoff tracking
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Audit Area
                </p>
                <h3 className="mt-1 text-base font-black text-slate-900">
                  {item.area}
                </h3>
              </div>
              <CMMCDomainStatusBadge status={item.status} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <CMMCDomainDetailStat label="Assigned Reviewer" value={item.reviewer} />
              <CMMCDomainDetailStat label="Completion" value={`${item.completion}%`} />
              <CMMCDomainDetailStat label="Last Reviewed" value={item.lastReviewed} />
            </div>

            <CMMCDomainProgressBar
              value={item.completion}
              color="#9d6f38"
              isVisible
              className="mt-4"
            />

            <label className="mt-4 block">
              <span className="sr-only">Checklist status for {item.area}</span>
              <select
                value={item.status}
                onChange={(event) => onStatusChange(item.id, event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
              >
                {cmmcAuditorChecklistStatuses.map((status) => (
                  <option key={status} value={status}>
                    Status: {status}
                  </option>
                ))}
              </select>
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}

function CMMCAuditorFindingCard({ finding, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        isSelected
          ? "border-blue-600 bg-blue-50"
          : "border-slate-200 bg-[#fffdf8]/72"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">
            {finding.id}
          </p>
          <h3 className="mt-1 text-base font-black text-slate-900">
            {finding.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {finding.controlId} - {finding.domainName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CMMCDomainStatusBadge status={finding.status} />
          <CMMCControlPriorityBadge priority={finding.priority} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <CMMCDomainDetailStat label="Owner" value={finding.owner} />
        <CMMCDomainDetailStat label="Risk" value={finding.riskLevel} />
        <CMMCDomainDetailStat label="Evidence" value={finding.evidenceItems.length} />
        <CMMCDomainDetailStat label="Policies" value={finding.policyReferences.length} />
      </div>

      <CMMCDomainProgressBar
        value={finding.progress}
        color={finding.domainColor}
        isVisible
        className="mt-4"
      />
    </button>
  );
}

function CMMCAuditorReviewPanel({ finding, reviewStatus, onReviewStatusChange }) {
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setDetailsVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out ${
        detailsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Auditor Review Panel
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {finding.id}
          </h2>
          <p className="mt-1 text-lg font-black text-slate-800">
            {finding.title}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CMMCDomainStatusBadge status={reviewStatus} />
          <CMMCControlPriorityBadge priority={finding.riskLevel} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <CMMCPolicyNarrativeBlock title="Finding" body={`${finding.id}: ${finding.title}`} />
        <CMMCPolicyNarrativeBlock title="Description" body={finding.description} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CMMCDomainDetailStat label="Mapped Domain" value={`${finding.domainCode} - ${finding.domainName}`} />
        <CMMCDomainDetailStat label="Mapped Control" value={finding.controlId} />
        <CMMCDomainDetailStat label="Risk" value={finding.riskLevel} />
        <CMMCDomainDetailStat label="Owner" value={finding.owner} />
        <CMMCDomainDetailStat label="Mock Approval Status" value={reviewStatus} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <CMMCPOAMDetailBlock
          title="Evidence"
          items={finding.evidenceItems.length ? finding.evidenceItems.map((evidence) => `${evidence.id}: ${evidence.name} (${evidence.status})`) : ["No mapped evidence yet"]}
        />
        <CMMCPOAMDetailBlock
          title="Policies"
          items={finding.policyReferences.length ? finding.policyReferences.map((policy) => `${policy.id}: ${policy.name}`) : ["No mapped policy reference yet"]}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <CMMCPolicyNarrativeBlock title="Recommendation" body={finding.recommendedRemediation} />
        <CMMCPolicyNarrativeBlock title="Auditor Notes" body={getCMMCAuditorNotes(finding, reviewStatus)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {cmmcAuditorReviewActions.map((action) => (
          <button
            key={action.status}
            type="button"
            onClick={() => onReviewStatusChange(action.status)}
            className={getCMMCAuditorActionClass(action.status, reviewStatus)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function getCMMCAuditorSummary(controls, evidenceItems, findings, sspSummary) {
  const controlsReady = controls.filter((control) => control.progress >= 80).length;
  const evidenceApproved = evidenceItems.filter((evidence) => evidence.status === "Approved").length;
  const openFindings = findings.filter((finding) => finding.status !== "Completed").length;
  const poamRemaining = findings.filter((finding) => finding.progress < 80).length;
  const approvedEvidenceRatio = evidenceItems.length
    ? Math.round((evidenceApproved / evidenceItems.length) * 100)
    : 0;
  const overallReadiness = Math.round((sspSummary.readiness + approvedEvidenceRatio) / 2);

  return {
    overallReadiness,
    domainsReviewed: sspSummary.domains,
    totalDomains: cmmcDomains.length,
    controlsReady,
    totalControls: controls.length,
    evidenceApproved,
    totalEvidence: evidenceItems.length,
    openFindings,
    poamRemaining,
  };
}

function getCMMCAuditorChecklistItems(summary) {
  return [
    {
      id: "domain-review",
      area: "Domain Review",
      status: "Completed",
      reviewer: "Compliance",
      completion: 100,
      lastReviewed: "2026-06-21",
    },
    {
      id: "control-sampling",
      area: "Control Sampling",
      status: summary.controlsReady >= 6 ? "In Progress" : "Open",
      reviewer: "Security",
      completion: Math.min(84, Math.max(45, summary.overallReadiness + 8)),
      lastReviewed: "2026-06-24",
    },
    {
      id: "evidence-package",
      area: "Evidence Package",
      status: summary.evidenceApproved >= 10 ? "In Progress" : "Needs Review",
      reviewer: "GRC",
      completion: Math.min(78, Math.max(35, summary.overallReadiness)),
      lastReviewed: "2026-06-26",
    },
    {
      id: "ssp-validation",
      area: "SSP Validation",
      status: "Completed",
      reviewer: "Compliance",
      completion: 100,
      lastReviewed: "2026-06-27",
    },
    {
      id: "poam-review",
      area: "POA&M Review",
      status: summary.poamRemaining > 4 ? "In Progress" : "Needs Review",
      reviewer: "Audit Lead",
      completion: Math.max(38, 100 - summary.poamRemaining * 8),
      lastReviewed: "2026-06-28",
    },
  ];
}

function getCMMCAuditorChecklistCompletion(status) {
  if (status === "Completed") {
    return 100;
  }

  if (status === "Needs Review") {
    return 72;
  }

  if (status === "In Progress") {
    return 54;
  }

  return 12;
}

function getCMMCAuditorDefaultReviewStatus(finding) {
  if (finding.status === "Completed" && finding.riskLevel === "Low") {
    return "Approved";
  }

  if (finding.riskLevel === "High") {
    return "Needs Review";
  }

  return "Pending";
}

function getCMMCAuditorNotes(finding, reviewStatus) {
  if (reviewStatus === "Approved") {
    return `Auditor accepted the current ${finding.controlId} remediation package for mock readiness tracking.`;
  }

  if (reviewStatus === "Rejected") {
    return `Auditor rejected the current ${finding.controlId} package and requested updated evidence before retesting.`;
  }

  return `Auditor should confirm evidence sufficiency, policy alignment, and owner remediation status for ${finding.controlId}.`;
}

function getCMMCAuditorActionClass(actionStatus, reviewStatus) {
  const baseClass = "inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-black transition";

  if (actionStatus === reviewStatus) {
    return `${baseClass} border-blue-600 bg-blue-600 text-white shadow-sm`;
  }

  if (actionStatus === "Approved") {
    return `${baseClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300`;
  }

  if (actionStatus === "Rejected") {
    return `${baseClass} border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300`;
  }

  return `${baseClass} border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300`;
}

const cmmcExportHistoryStatusFilters = ["All", "Completed", "Queued", "Failed"];

const cmmcExportActions = ["Preview", "Generate", "Download"];

function CMMCExportCenterPanel() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast, setToast] = useState(null);
  const [pageVisible, setPageVisible] = useState(false);
  const controls = useMemo(
    () => cmmcControlsMockData.map((control) => getCMMCControlDetails(control)),
    []
  );
  const evidenceItems = useMemo(() => getCMMCEvidenceItemsFromControls(controls), [controls]);
  const policies = useMemo(
    () => cmmcPoliciesMockData.map((policy) => getCMMCPolicyDetails(policy, controls)),
    [controls]
  );
  const sspSummary = useMemo(() => getCMMCSSPComplianceSummary(controls), [controls]);
  const findings = useMemo(
    () => getCMMCPOAMFindings(controls, evidenceItems, policies),
    [controls, evidenceItems, policies]
  );
  const exportOptions = useMemo(
    () => getCMMCExportOptions(controls, evidenceItems, policies, findings, sspSummary),
    [controls, evidenceItems, findings, policies, sspSummary]
  );
  const exportHistory = useMemo(() => getCMMCExportHistory(exportOptions), [exportOptions]);
  const exportSummary = useMemo(
    () => getCMMCExportSummary(exportOptions, exportHistory),
    [exportHistory, exportOptions]
  );
  const filteredHistory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return exportHistory.filter((historyItem) => {
      const matchesQuery =
        !normalizedQuery ||
        historyItem.document.toLowerCase().includes(normalizedQuery) ||
        historyItem.generatedBy.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "All" || historyItem.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [exportHistory, query, statusFilter]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setPageVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = setTimeout(() => setToast(null), 2600);

    return () => clearTimeout(timeoutId);
  }, [toast]);

  function handleExportAction(action, option) {
    setToast({
      id: `${option.id}-${action}-${Date.now()}`,
      title: `${action} ready`,
      message: getCMMCExportActionMessage(action, option),
    });
  }

  return (
    <div
      className={`space-y-4 transition-all duration-500 ease-out ${
        pageVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-blue-700">
              Export Center
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              CMMC Compliance Exports
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Mock export workspace for packaging SSP, POA&amp;M, evidence, policies, audit readiness, and executive reporting.
            </p>
          </div>

          {toast && (
            <div
              key={toast.id}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm transition-all duration-300 ease-out"
            >
              <p className="text-sm font-black text-emerald-800">
                {toast.title}
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {toast.message}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CMMCSummaryCard label="Total Exports" value={exportSummary.totalExports} />
          <CMMCSummaryCard label="Latest Export" value={exportSummary.latestExport} />
          <CMMCSummaryCard label="Audit Packages" value={exportSummary.auditPackages} />
          <CMMCSummaryCard label="Compliance Documents" value={exportSummary.complianceDocuments} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
            <Download size={16} className="text-slate-500" />
            Export Options
          </button>
          <p className="ml-6 text-xs font-semibold text-slate-400">
            Mock actions only. No backend, storage, or file generation is connected.
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {exportOptions.map((option, index) => (
            <CMMCExportCard
              key={option.id}
              option={option}
              index={index}
              isVisible={pageVisible}
              onAction={handleExportAction}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
              <ArrowUpDown size={16} className="text-slate-500" />
              Recent Export History
            </button>
            <p className="ml-6 text-xs font-semibold text-slate-400">
              Search and filter mock export activity
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px] lg:w-[520px]">
            <label className="relative">
              <span className="sr-only">Search CMMC export history</span>
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search document or generator"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600"
              />
            </label>

            <label>
              <span className="sr-only">Export history status filter</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-600"
              >
                {cmmcExportHistoryStatusFilters.map((status) => (
                  <option key={status} value={status}>
                    Status: {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50/90 text-xs font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Generated By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">File Format</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredHistory.map((historyItem) => (
                <CMMCExportHistoryRow key={historyItem.id} historyItem={historyItem} />
              ))}
            </tbody>
          </table>
        </div>

        {!filteredHistory.length && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-[#fffdf8]/62 px-6 py-10 text-center">
            <p className="text-sm font-black text-slate-900">
              No export history found.
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Adjust the search or status filter to review more mock exports.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function CMMCExportCard({ option, index, isVisible, onAction }) {
  return (
    <article
      className={`rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4 shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-md ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      style={{ transitionDelay: `${index * CMMC_CARD_STAGGER_MS}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">
            {option.fileType}
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-900">
            {option.title}
          </h3>
        </div>
        <CMMCDomainStatusBadge status={option.status} />
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
        {option.description}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CMMCDomainDetailStat label="Last Generated" value={option.lastGenerated} />
        <CMMCDomainDetailStat label="File Type" value={option.fileType} />
        <CMMCDomainDetailStat label="Mock Size" value={option.mockSize} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {cmmcExportActions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action, option)}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
          >
            {action}
          </button>
        ))}
      </div>
    </article>
  );
}

function CMMCExportHistoryRow({ historyItem }) {
  return (
    <tr className="transition hover:bg-blue-50/50">
      <td className="px-4 py-3 align-top font-semibold text-slate-600">
        {historyItem.date}
      </td>
      <td className="px-4 py-3 align-top font-black text-slate-800">
        {historyItem.document}
      </td>
      <td className="px-4 py-3 align-top font-semibold text-slate-600">
        {historyItem.generatedBy}
      </td>
      <td className="px-4 py-3 align-top">
        <CMMCDomainStatusBadge status={historyItem.status} />
      </td>
      <td className="px-4 py-3 align-top font-black text-slate-700">
        {historyItem.fileFormat}
      </td>
    </tr>
  );
}

function getCMMCExportOptions(controls, evidenceItems, policies, findings, sspSummary) {
  const approvedEvidence = evidenceItems.filter((evidence) => evidence.status === "Approved").length;
  const approvedPolicies = policies.filter((policy) => policy.status === "Approved").length;
  const remainingFindings = findings.filter((finding) => finding.status !== "Completed").length;

  return [
    {
      id: "ssp",
      title: "System Security Plan (SSP)",
      description: `System profile, scope, responsibilities, and ${sspSummary.domains} CMMC domains prepared for assessor review.`,
      lastGenerated: "2026-06-29",
      status: "Completed",
      fileType: "PDF",
      mockSize: "2.4 MB",
      category: "Compliance Document",
    },
    {
      id: "poam",
      title: "POA&M Report",
      description: `${remainingFindings} open or in-progress remediation items with owners, target dates, risk, and recommendations.`,
      lastGenerated: "2026-06-28",
      status: "Completed",
      fileType: "XLSX",
      mockSize: "840 KB",
      category: "Audit Package",
    },
    {
      id: "evidence",
      title: "Evidence Package",
      description: `${approvedEvidence} approved evidence artifacts mapped to controls and assessment objectives.`,
      lastGenerated: "2026-06-27",
      status: "Queued",
      fileType: "ZIP",
      mockSize: "18.6 MB",
      category: "Audit Package",
    },
    {
      id: "policies",
      title: "Policy Package",
      description: `${approvedPolicies} approved policies with mapped controls, domains, owners, and review dates.`,
      lastGenerated: "2026-06-24",
      status: "Completed",
      fileType: "PDF",
      mockSize: "4.1 MB",
      category: "Compliance Document",
    },
    {
      id: "readiness",
      title: "Audit Readiness Report",
      description: `Readiness snapshot across ${controls.length} controls, evidence approval, POA&M status, and auditor review state.`,
      lastGenerated: "2026-06-21",
      status: "Completed",
      fileType: "PDF",
      mockSize: "1.7 MB",
      category: "Audit Package",
    },
    {
      id: "executive",
      title: "Executive Summary",
      description: `Leadership summary of ${sspSummary.readiness}% implementation readiness, open findings, and next assessment actions.`,
      lastGenerated: "2026-06-18",
      status: "Failed",
      fileType: "PDF",
      mockSize: "620 KB",
      category: "Compliance Document",
    },
  ];
}

function getCMMCExportHistory(exportOptions) {
  const generatedBy = {
    ssp: "Maya Patel",
    poam: "Compliance",
    evidence: "GRC",
    policies: "Security",
    readiness: "Audit Lead",
    executive: "Maya Patel",
  };

  return exportOptions.map((option, index) => ({
    id: `EXPORT-${String(index + 1).padStart(3, "0")}`,
    date: option.lastGenerated,
    document: option.title,
    generatedBy: generatedBy[option.id] || "Compliance",
    status: option.status,
    fileFormat: option.fileType,
  }));
}

function getCMMCExportSummary(exportOptions, exportHistory) {
  const latestCompletedExport = exportHistory.find((historyItem) => historyItem.status === "Completed");

  return {
    totalExports: exportHistory.length,
    latestExport: latestCompletedExport?.date || "Not generated",
    auditPackages: exportOptions.filter((option) => option.category === "Audit Package").length,
    complianceDocuments: exportOptions.filter((option) => option.category === "Compliance Document").length,
  };
}

function getCMMCExportActionMessage(action, option) {
  if (action === "Preview") {
    return `${option.title} preview opened as a mock local action.`;
  }

  if (action === "Generate") {
    return `${option.title} generation queued in local mock state only.`;
  }

  return `${option.title} download acknowledged without creating a file.`;
}

function CMMCSSPPanel() {
  const [expandedSectionId, setExpandedSectionId] = useState("organization");
  const [pageVisible, setPageVisible] = useState(false);
  const controls = useMemo(
    () => cmmcControlsMockData.map((control) => getCMMCControlDetails(control)),
    []
  );
  const summary = useMemo(() => getCMMCSSPComplianceSummary(controls), [controls]);
  const sections = getCMMCSSPSections(summary);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setPageVisible(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div
      className={`space-y-4 transition-all duration-500 ease-out ${
        pageVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-blue-700">
              System Security Plan
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              CMMC SSP Workspace
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Mock system security plan profile for documenting scope, environment, responsibilities, assets, and CMMC readiness.
            </p>
          </div>

          <div className="grid place-items-center rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
            <CMMCProgressRing
              value={summary.readiness}
              size={96}
              stroke={9}
              progressColor="#9d6f38"
              trackColor={CMMC_RING_TRACK_COLOR}
              textColor={CMMC_RING_TEXT_COLOR}
              duration={CMMC_RING_DURATION_MS}
              label={`Overall readiness: ${summary.readiness}%`}
            />
            <p className="mt-2 text-xs font-black uppercase tracking-widest text-slate-400">
              Overall Readiness
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {sections.map((section) => (
          <CMMCSSPAccordionSection
            key={section.id}
            section={section}
            isOpen={expandedSectionId === section.id}
            onToggle={() =>
              setExpandedSectionId((currentSectionId) =>
                currentSectionId === section.id ? null : section.id
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function CMMCSSPAccordionSection({ section, isOpen, onToggle }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
        aria-expanded={isOpen}
      >
        <div>
          <h3 className="text-lg font-black text-slate-900">
            {section.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {section.description}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`mt-1 shrink-0 text-slate-400 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-5 py-5">
            {section.content}
          </div>
        </div>
      </div>
    </section>
  );
}

function getCMMCSSPSections(summary) {
  return [
    {
      id: "organization",
      title: "Organization Information",
      description: "Business ownership and assessment scope.",
      content: <CMMCSSPFieldGrid fields={cmmcSSPMockData.organization} />,
    },
    {
      id: "system",
      title: "System Information",
      description: "Core system profile and hosting details.",
      content: <CMMCSSPFieldGrid fields={cmmcSSPMockData.system} />,
    },
    {
      id: "boundary",
      title: "System Boundary",
      description: "Included systems, excluded systems, and connected services.",
      content: <CMMCSSPFieldGrid fields={cmmcSSPMockData.boundary} />,
    },
    {
      id: "cui",
      title: "CUI Description",
      description: "Controlled Unclassified Information handled by the system.",
      content: <CMMCSSPParagraph>{cmmcSSPMockData.cuiDescription}</CMMCSSPParagraph>,
    },
    {
      id: "purpose",
      title: "System Purpose",
      description: "Business and compliance purpose of the platform.",
      content: <CMMCSSPParagraph>{cmmcSSPMockData.purpose}</CMMCSSPParagraph>,
    },
    {
      id: "environment",
      title: "Environment",
      description: "Operating environment and protection assumptions.",
      content: <CMMCSSPParagraph>{cmmcSSPMockData.environment}</CMMCSSPParagraph>,
    },
    {
      id: "responsibilities",
      title: "Security Responsibilities",
      description: "Teams responsible for operating and governing the system.",
      content: <CMMCSSPTagList items={cmmcSSPMockData.responsibilities} />,
    },
    {
      id: "assets",
      title: "Asset Summary",
      description: "High-level mock asset inventory summary.",
      content: <CMMCSSPMetricGrid metrics={cmmcSSPMockData.assets} />,
    },
    {
      id: "compliance",
      title: "Compliance Summary",
      description: "CMMC readiness counts generated from the mock workspace.",
      content: <CMMCSSPComplianceSummary summary={summary} />,
    },
  ];
}

function CMMCSSPFieldGrid({ fields }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Object.entries(fields).map(([label, value]) => (
        <CMMCSSPField key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function CMMCSSPField({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-black leading-6 text-slate-800">
        {value}
      </p>
    </div>
  );
}

function CMMCSSPParagraph({ children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
      <p className="text-sm font-semibold leading-7 text-slate-600">
        {children}
      </p>
    </div>
  );
}

function CMMCSSPTagList({ items }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-800"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function CMMCSSPMetricGrid({ metrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map(([label, value]) => (
        <CMMCDomainDetailStat key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function CMMCSSPComplianceSummary({ summary }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_180px] xl:items-center">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <CMMCDomainDetailStat label="Domains" value={summary.domains} />
        <CMMCDomainDetailStat label="Controls" value={summary.controls} />
        <CMMCDomainDetailStat label="Assessment Objectives" value={summary.objectives} />
        <CMMCDomainDetailStat label="Evidence" value={summary.evidence} />
        <CMMCDomainDetailStat label="Policies" value={summary.policies} />
        <CMMCDomainDetailStat label="Overall Readiness" value={`${summary.readiness}%`} />
      </div>

      <div className="grid place-items-center rounded-lg border border-slate-200 bg-[#fffdf8]/72 p-4">
        <CMMCProgressRing
          value={summary.readiness}
          size={116}
          stroke={10}
          progressColor="#9d6f38"
          trackColor={CMMC_RING_TRACK_COLOR}
          textColor={CMMC_RING_TEXT_COLOR}
          duration={CMMC_RING_DURATION_MS}
          label={`Overall readiness: ${summary.readiness}%`}
        />
      </div>
    </div>
  );
}

function getCMMCSSPComplianceSummary(controls) {
  const evidenceItems = getCMMCEvidenceItemsFromControls(controls);
  const objectives = controls.reduce(
    (objectiveCount, control) => objectiveCount + control.assessmentObjectives.length,
    0
  );
  const policies = controls.reduce(
    (policyCount, control) => policyCount + control.policies,
    0
  );
  const readiness = Math.round(
    controls.reduce((totalProgress, control) => totalProgress + control.progress, 0) / controls.length
  );

  return {
    domains: cmmcDomains.length,
    controls: controls.length,
    objectives,
    evidence: evidenceItems.length,
    policies,
    readiness,
  };
}

function RiskScenariosSection({ rows, questionnaireResponses, workspaceData, selectedFramework, onSelectWorkspaceItem }) {
  const [query, setQuery] = useState("");
  const [filterBy, setFilterBy] = useState("All");
  const [sortBy, setSortBy] = useState("dueDate");
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(
    riskColumns.reduce((columns, column) => ({ ...columns, [column.key]: true }), {})
  );

  const filteredRisks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows
      .filter((risk) => {
        const matchesQuery =
          !normalizedQuery ||
          Object.values(risk).join(" ").toLowerCase().includes(normalizedQuery);
        const matchesFilter =
          filterBy === "All" ||
          risk.status === filterBy ||
          risk.severity === filterBy ||
          risk.category === filterBy;

        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => compareRiskRows(a, b, sortBy));
  }, [filterBy, query, rows, sortBy]);

  const resetTable = () => {
    setQuery("");
    setFilterBy("All");
    setSortBy("dueDate");
    setSelectedRisk(null);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-white/75 bg-white/62 shadow-xl shadow-slate-900/5 backdrop-blur">
      <div className="border-b border-slate-100 px-6 py-5">
        <SectionHeader
          title="Risk Scenarios"
          description={`Search, review, and prioritize mapped risk scenarios for ${selectedFramework.name}.`}
        />
      </div>

      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500"
              placeholder="Search risks by ID, title, owner, reviewer, or category"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
              <Filter size={16} />
              <select
                value={filterBy}
                onChange={(event) => setFilterBy(event.target.value)}
                className="bg-transparent font-bold outline-none"
              >
                <option value="All">Filter</option>
                <option value="High">High severity</option>
                <option value="Medium">Medium severity</option>
                <option value="Low">Low severity</option>
                <option value="Open">Open</option>
                <option value="In Progress">In progress</option>
                <option value="In Review">In review</option>
                <option value="Ready">Ready</option>
              </select>
            </label>

            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
              <ArrowUpDown size={16} />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent font-bold outline-none"
              >
                <option value="dueDate">Sort by due date</option>
                <option value="severity">Sort by severity</option>
                <option value="status">Sort by status</option>
                <option value="title">Sort by title</option>
              </select>
            </label>

            <details className="relative">
              <summary className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
                <SlidersHorizontal size={16} />
                Column Settings
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  Columns
                </p>
                <div className="space-y-2">
                  {riskColumns.map((column) => (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.key]}
                        onChange={() =>
                          setVisibleColumns((current) => ({
                            ...current,
                            [column.key]: !current[column.key],
                          }))
                        }
                      />
                      {column.label}
                    </label>
                  ))}
                </div>
              </div>
            </details>

            <ExportMenu compact data={{ ...emptyImplementationData, risks: rows }} />

            <button
              type="button"
              onClick={resetTable}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50/90 text-xs font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-12 border-b border-slate-200 px-4 py-3">
                <input type="checkbox" aria-label="Select all risk scenarios" />
              </th>
              {riskColumns
                .filter((column) => visibleColumns[column.key])
                .map((column) => (
                  <th key={column.key} className="border-b border-slate-200 px-4 py-3">
                    {column.label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="bg-white/60">
            {filteredRisks.map((risk) => {
              const applicability = getQuestionnaireApplicability(risk, questionnaireResponses);
              const isDisabled = applicability === "Not applicable";

              return (
              <tr
                key={risk.id}
                onClick={() => {
                  if (isDisabled) return;
                  setSelectedRisk(risk);
                  onSelectWorkspaceItem(createWorkspaceItem("Risk", risk));
                }}
                onKeyDown={(event) => {
                  if (!isDisabled && (event.key === "Enter" || event.key === " ")) {
                    setSelectedRisk(risk);
                    onSelectWorkspaceItem(createWorkspaceItem("Risk", risk));
                  }
                }}
                role={isDisabled ? undefined : "button"}
                tabIndex={isDisabled ? -1 : 0}
                aria-disabled={isDisabled}
                className={`border-b border-slate-100 transition last:border-0 ${
                  isDisabled
                    ? "cursor-not-allowed bg-slate-50/70 opacity-60"
                    : `cursor-pointer hover:bg-blue-50/50 ${selectedRisk?.id === risk.id ? "bg-blue-50/70" : ""}`
                }`}
              >
                <RiskCell>
                  <input type="checkbox" aria-label={`Select ${risk.id}`} onClick={(event) => event.stopPropagation()} />
                </RiskCell>
                {visibleColumns.id && <RiskCell strong>{risk.id}</RiskCell>}
                {visibleColumns.title && (
                  <RiskCell>
                    <span className="font-black text-slate-900">
                      {risk.title}
                    </span>
                  </RiskCell>
                )}
                {visibleColumns.status && (
                  <RiskCell>
                    {renderStatusPill(risk, applicability, workspaceData)}
                  </RiskCell>
                )}
                {visibleColumns.progressStatus && (
                  <RiskCell>{renderProgressStatusPill(risk, workspaceData)}</RiskCell>
                )}
                {visibleColumns.owner && <RiskCell>{risk.owner}</RiskCell>}
                {visibleColumns.dueDate && <RiskCell>{risk.dueDate}</RiskCell>}
                {visibleColumns.category && <RiskCell>{risk.category}</RiskCell>}
                {visibleColumns.initialRiskScore && <RiskCell>{risk.initialRiskScore}</RiskCell>}
                {visibleColumns.residualRiskScore && <RiskCell>{risk.residualRiskScore}</RiskCell>}
                {visibleColumns.controls && <RiskCell>{risk.controls}</RiskCell>}
                {visibleColumns.comments && (
                  <RiskCell>
                    <span className="inline-flex items-center gap-1 font-black">
                      <MessageSquare size={14} />
                      {risk.comments}
                    </span>
                  </RiskCell>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredRisks.length && <EmptyRows label="risk scenarios" />}
      </div>

    </section>
  );
}

function ControlsSection({ rows, questionnaireResponses, workspaceData, selectedFramework, onSelectWorkspaceItem }) {
  const [query, setQuery] = useState("");
  const [filterBy, setFilterBy] = useState("All");
  const [sortBy, setSortBy] = useState("dueDate");
  const [selectedControl, setSelectedControl] = useState(null);

  const filteredControls = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows
      .filter((control) => {
        const matchesQuery =
          !normalizedQuery ||
          Object.values(control).join(" ").toLowerCase().includes(normalizedQuery);
        const matchesFilter =
          filterBy === "All" ||
          control.status === filterBy ||
          control.evidenceStatus === filterBy ||
          control.owner === filterBy;

        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => compareControlRows(a, b, sortBy));
  }, [filterBy, query, rows, sortBy]);

  const resetTable = () => {
    setQuery("");
    setFilterBy("All");
    setSortBy("dueDate");
    setSelectedControl(null);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-white/75 bg-white/62 shadow-xl shadow-slate-900/5 backdrop-blur">
      <div className="border-b border-slate-100 px-6 py-5">
        <SectionHeader
          title="Controls"
          description={`Search, review, and prioritize mapped controls for ${selectedFramework.name}. Questionnaire matches are highlighted.`}
        />
      </div>

      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500"
              placeholder="Search controls by ID, title, owner, reviewer, or evidence status"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
              <Filter size={16} />
              <select
                value={filterBy}
                onChange={(event) => setFilterBy(event.target.value)}
                className="bg-transparent font-bold outline-none"
              >
                <option value="All">Filter</option>
                <option value="Implemented">Implemented</option>
                <option value="In Progress">In progress</option>
                <option value="Needs Review">Needs review</option>
                <option value="Open">Open</option>
                <option value="Ready">Evidence ready</option>
                <option value="Partial">Evidence partial</option>
                <option value="Missing">Evidence missing</option>
              </select>
            </label>

            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
              <ArrowUpDown size={16} />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent font-bold outline-none"
              >
                <option value="dueDate">Sort by due date</option>
                <option value="status">Sort by status</option>
                <option value="evidenceStatus">Sort by evidence</option>
                <option value="title">Sort by title</option>
              </select>
            </label>

            <ExportMenu compact data={{ ...emptyImplementationData, controls: rows }} />

            <button
              type="button"
              onClick={resetTable}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50/90 text-xs font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-12 border-b border-slate-200 px-4 py-3">
                <input type="checkbox" aria-label="Select all controls" />
              </th>
              {controlColumns.map((column) => (
                <th key={column.key} className="border-b border-slate-200 px-4 py-3">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white/60">
            {filteredControls.map((control) => {
              const applicability = getQuestionnaireApplicability(control, questionnaireResponses);
              const isDisabled = applicability === "Not applicable";

              return (
              <tr
                key={control.id}
                onClick={() => {
                  if (isDisabled) return;
                  setSelectedControl(control);
                  onSelectWorkspaceItem(createWorkspaceItem("Control", control));
                }}
                onKeyDown={(event) => {
                  if (!isDisabled && (event.key === "Enter" || event.key === " ")) {
                    setSelectedControl(control);
                    onSelectWorkspaceItem(createWorkspaceItem("Control", control));
                  }
                }}
                role={isDisabled ? undefined : "button"}
                tabIndex={isDisabled ? -1 : 0}
                aria-disabled={isDisabled}
                className={`border-b border-slate-100 transition last:border-0 ${
                  isDisabled
                    ? "cursor-not-allowed bg-slate-50/70 opacity-60"
                    : `cursor-pointer hover:bg-blue-50/50 ${
                        selectedControl?.id === control.id || isRelevantToQuestionnaire(control, questionnaireResponses) ? "bg-blue-50/70" : ""
                      }`
                }`}
              >
                <RiskCell>
                  <input type="checkbox" aria-label={`Select ${control.id}`} onClick={(event) => event.stopPropagation()} />
                </RiskCell>
                <RiskCell strong>{control.id}</RiskCell>
                <RiskCell>
                  <span className="font-black text-slate-900">
                    {control.title}
                  </span>
                  {isRelevantToQuestionnaire(control, questionnaireResponses) && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-800">
                      Prioritized
                    </span>
                  )}
                </RiskCell>
                <RiskCell>
                  {renderStatusPill(control, applicability, workspaceData)}
                </RiskCell>
                <RiskCell>{renderProgressStatusPill(control, workspaceData)}</RiskCell>
                <RiskCell>{control.owner}</RiskCell>
                <RiskCell>{control.dueDate}</RiskCell>
                <RiskCell>{control.category}</RiskCell>
                <RiskCell>{control.trustServiceCriteria}</RiskCell>
                <RiskCell>{control.mappedTests}</RiskCell>
                <RiskCell>{control.mappedRisks}</RiskCell>
              </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredControls.length && <EmptyRows label="controls" />}
      </div>

    </section>
  );
}

function TestsSection({ rows, questionnaireResponses, workspaceData, selectedFramework, onSelectWorkspaceItem }) {
  const [query, setQuery] = useState("");
  const [filterBy, setFilterBy] = useState("All");
  const [sortBy, setSortBy] = useState("dueDate");
  const [selectedTest, setSelectedTest] = useState(null);

  const filteredTests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows
      .filter((test) => {
        const matchesQuery =
          !normalizedQuery ||
          Object.values(test).join(" ").toLowerCase().includes(normalizedQuery);
        const matchesFilter =
          filterBy === "All" ||
          test.status === filterBy ||
          test.evidenceStatus === filterBy ||
          test.owner === filterBy;

        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => compareTestRows(a, b, sortBy));
  }, [filterBy, query, rows, sortBy]);

  const resetTable = () => {
    setQuery("");
    setFilterBy("All");
    setSortBy("dueDate");
    setSelectedTest(null);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-white/75 bg-white/62 shadow-xl shadow-slate-900/5 backdrop-blur">
      <div className="border-b border-slate-100 px-6 py-5">
        <SectionHeader
          title="Tests"
          description={`Search, review, and prioritize mapped tests for ${selectedFramework.name}.`}
        />
      </div>

      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500"
              placeholder="Search tests by ID, title, owner, reviewer, or evidence status"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
              <Filter size={16} />
              <select
                value={filterBy}
                onChange={(event) => setFilterBy(event.target.value)}
                className="bg-transparent font-bold outline-none"
              >
                <option value="All">Filter</option>
                <option value="Ready">Ready</option>
                <option value="In Progress">In progress</option>
                <option value="In Review">In review</option>
                <option value="Open">Open</option>
                <option value="Partial">Evidence partial</option>
                <option value="Missing">Evidence missing</option>
              </select>
            </label>

            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
              <ArrowUpDown size={16} />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent font-bold outline-none"
              >
                <option value="dueDate">Sort by due date</option>
                <option value="status">Sort by status</option>
                <option value="evidenceStatus">Sort by evidence</option>
                <option value="title">Sort by title</option>
              </select>
            </label>

            <ExportMenu compact data={{ ...emptyImplementationData, tests: rows }} />

            <button
              type="button"
              onClick={resetTable}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50/90 text-xs font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-12 border-b border-slate-200 px-4 py-3">
                <input type="checkbox" aria-label="Select all tests" />
              </th>
              {testColumns.map((column) => (
                <th key={column.key} className="border-b border-slate-200 px-4 py-3">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white/60">
            {filteredTests.map((test) => {
              const applicability = getQuestionnaireApplicability(test, questionnaireResponses);
              const isDisabled = applicability === "Not applicable";

              return (
              <tr
                key={test.id}
                onClick={() => {
                  if (isDisabled) return;
                  setSelectedTest(test);
                  onSelectWorkspaceItem(createWorkspaceItem("Test", test));
                }}
                onKeyDown={(event) => {
                  if (!isDisabled && (event.key === "Enter" || event.key === " ")) {
                    setSelectedTest(test);
                    onSelectWorkspaceItem(createWorkspaceItem("Test", test));
                  }
                }}
                role={isDisabled ? undefined : "button"}
                tabIndex={isDisabled ? -1 : 0}
                aria-disabled={isDisabled}
                className={`border-b border-slate-100 transition last:border-0 ${
                  isDisabled
                    ? "cursor-not-allowed bg-slate-50/70 opacity-60"
                    : `cursor-pointer hover:bg-blue-50/50 ${selectedTest?.id === test.id ? "bg-blue-50/70" : ""}`
                }`}
              >
                <RiskCell>
                  <input type="checkbox" aria-label={`Select ${test.id}`} onClick={(event) => event.stopPropagation()} />
                </RiskCell>
                <RiskCell strong>{test.id}</RiskCell>
                <RiskCell>
                  <span className="font-black text-slate-900">
                    {test.title}
                  </span>
                </RiskCell>
                <RiskCell>
                  {renderStatusPill(test, applicability, workspaceData)}
                </RiskCell>
                <RiskCell>{renderProgressStatusPill(test, workspaceData)}</RiskCell>
                <RiskCell>{test.owner}</RiskCell>
                <RiskCell>{test.dueDate}</RiskCell>
                <RiskCell>{test.category}</RiskCell>
                <RiskCell>
                  <span className="inline-flex items-center gap-1 font-black">
                    <MessageSquare size={14} />
                    {test.comments}
                  </span>
                </RiskCell>
              </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredTests.length && <EmptyRows label="tests" />}
      </div>

    </section>
  );
}

function PoliciesSection({ rows, questionnaireResponses, workspaceData, selectedFramework, onSelectWorkspaceItem }) {
  const [query, setQuery] = useState("");
  const [filterBy, setFilterBy] = useState("All");
  const [sortBy, setSortBy] = useState("title");

  const filteredPolicies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows
      .filter((policy) => {
        const matchesQuery =
          !normalizedQuery ||
          Object.values(policy).join(" ").toLowerCase().includes(normalizedQuery);
        const matchesFilter =
          filterBy === "All" ||
          policy.status === filterBy ||
          policy.category === filterBy;

        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => compareControlRows(a, b, sortBy));
  }, [filterBy, query, rows, sortBy]);

  const resetTable = () => {
    setQuery("");
    setFilterBy("All");
    setSortBy("title");
  };

  return (
    <section className="overflow-hidden rounded-lg border border-white/75 bg-white/62 shadow-xl shadow-slate-900/5 backdrop-blur">
      <div className="border-b border-slate-100 px-6 py-5">
        <SectionHeader
          title="Policies"
          description={`Review the policy library for ${selectedFramework.name}.`}
        />
      </div>

      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500"
              placeholder="Search policies by ID, title, or category"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
              <Filter size={16} />
              <select value={filterBy} onChange={(event) => setFilterBy(event.target.value)} className="bg-transparent font-bold outline-none">
                <option value="All">Filter</option>
                <option value="Library">Library</option>
                <option value="Access Control">Access control</option>
                <option value="Operations">Operations</option>
                <option value="Data Protection">Data protection</option>
                <option value="Governance">Governance</option>
              </select>
            </label>

            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
              <ArrowUpDown size={16} />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="bg-transparent font-bold outline-none">
                <option value="title">Sort by title</option>
                <option value="status">Sort by status</option>
                <option value="category">Sort by category</option>
              </select>
            </label>

            <ExportMenu compact data={{ ...emptyImplementationData, policies: rows }} />

            <button type="button" onClick={resetTable} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50/90 text-xs font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-12 border-b border-slate-200 px-4 py-3">
                <input type="checkbox" aria-label="Select all policies" />
              </th>
              {policyColumns.map((column) => (
                <th key={column.key} className="border-b border-slate-200 px-4 py-3">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white/60">
            {filteredPolicies.map((policy) => {
              const applicability = getQuestionnaireApplicability(policy, questionnaireResponses);
              const isDisabled = applicability === "Not applicable";

              return (
              <tr
                key={policy.id}
                onClick={() => {
                  if (!isDisabled) onSelectWorkspaceItem(createWorkspaceItem("Policy", policy));
                }}
                role={isDisabled ? undefined : "button"}
                tabIndex={isDisabled ? -1 : 0}
                aria-disabled={isDisabled}
                className={`border-b border-slate-100 transition last:border-0 ${
                  isDisabled ? "cursor-not-allowed bg-slate-50/70 opacity-60" : "cursor-pointer hover:bg-blue-50/50"
                }`}
              >
                <RiskCell>
                  <input type="checkbox" aria-label={`Select ${policy.id}`} onClick={(event) => event.stopPropagation()} />
                </RiskCell>
                <RiskCell strong>{policy.id}</RiskCell>
                <RiskCell><span className="font-black text-slate-900">{policy.title}</span></RiskCell>
                <RiskCell>{renderStatusPill(policy, applicability, workspaceData)}</RiskCell>
                <RiskCell>{policy.owner}</RiskCell>
                <RiskCell>{policy.dueDate}</RiskCell>
                <RiskCell>{policy.category}</RiskCell>
                <RiskCell>{policy.comments}</RiskCell>
              </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredPolicies.length && <EmptyRows label="policies" />}
      </div>
    </section>
  );
}

function MandatoryDocsSection({ rows, workspaceData, selectedFramework, onSelectWorkspaceItem }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="divide-y divide-slate-100">
        {rows.map((document) => {
          const status = getMandatoryDocStatus(document, workspaceData);
          const isReady = status === "READY";

          return (
            <button
              key={document.id}
              type="button"
              onClick={() => onSelectWorkspaceItem(createWorkspaceItem("Policy", document))}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-6 py-4 text-left transition hover:bg-blue-50/40 focus:bg-blue-50/60 focus:outline-none"
            >
              <span className="min-w-0 text-sm font-black text-slate-700">
                {document.title}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide ${
                isReady ? "text-blue-700" : "text-rose-600"
              }`}>
                <span className={`grid h-3.5 w-3.5 place-items-center rounded-full border text-[9px] leading-none ${
                  isReady ? "border-blue-500 text-blue-700" : "border-rose-500 text-rose-600"
                }`}>
                  {isReady ? "OK" : "!"}
                </span>
                {status}
              </span>
              <ArrowRight size={15} className="text-slate-300" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {!rows.length && (
        <div className="px-6 py-10 text-center text-sm font-semibold text-slate-400">
          No mandatory documents found for {selectedFramework.name}.
        </div>
      )}
    </section>
  );
}

function PopulationSection({ rows, questionnaireResponses, workspaceData, selectedFramework, onSelectWorkspaceItem }) {
  const [query, setQuery] = useState("");
  const [filterBy, setFilterBy] = useState("All");
  const [sortBy, setSortBy] = useState("dueDate");

  const filteredPopulations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows
      .filter((population) => {
        const matchesQuery =
          !normalizedQuery ||
          Object.values(population).join(" ").toLowerCase().includes(normalizedQuery);
        const matchesFilter =
          filterBy === "All" ||
          population.status === filterBy ||
          population.category === filterBy;

        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => compareControlRows(a, b, sortBy));
  }, [filterBy, query, rows, sortBy]);

  const resetTable = () => {
    setQuery("");
    setFilterBy("All");
    setSortBy("dueDate");
  };

  return (
    <section className="overflow-hidden rounded-lg border border-white/75 bg-white/62 shadow-xl shadow-slate-900/5 backdrop-blur">
      <div className="border-b border-slate-100 px-6 py-5">
        <SectionHeader
          title="Populations"
          description={`Review scoped populations for ${selectedFramework.name}.`}
        />
      </div>

      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500"
              placeholder="Search populations by ID, title, owner, or category"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
              <Filter size={16} />
              <select value={filterBy} onChange={(event) => setFilterBy(event.target.value)} className="bg-transparent font-bold outline-none">
                <option value="All">Filter</option>
                <option value="Ready">Ready</option>
                <option value="In Review">In review</option>
                <option value="Access Control">Access control</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Workforce">Workforce</option>
              </select>
            </label>

            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
              <ArrowUpDown size={16} />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="bg-transparent font-bold outline-none">
                <option value="dueDate">Sort by due date</option>
                <option value="status">Sort by status</option>
                <option value="title">Sort by title</option>
              </select>
            </label>

            <ExportMenu compact data={{ ...emptyImplementationData, populations: rows }} />

            <button type="button" onClick={resetTable} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50/90 text-xs font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-12 border-b border-slate-200 px-4 py-3">
                <input type="checkbox" aria-label="Select all populations" />
              </th>
              {populationColumns.map((column) => (
                <th key={column.key} className="border-b border-slate-200 px-4 py-3">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white/60">
            {filteredPopulations.map((population) => {
              const applicability = getQuestionnaireApplicability(population, questionnaireResponses);
              const isDisabled = applicability === "Not applicable";

              return (
              <tr
                key={population.id}
                onClick={() => {
                  if (!isDisabled) onSelectWorkspaceItem(createWorkspaceItem("Population", population));
                }}
                role={isDisabled ? undefined : "button"}
                tabIndex={isDisabled ? -1 : 0}
                aria-disabled={isDisabled}
                className={`border-b border-slate-100 transition last:border-0 ${
                  isDisabled ? "cursor-not-allowed bg-slate-50/70 opacity-60" : "cursor-pointer hover:bg-blue-50/50"
                }`}
              >
                <RiskCell>
                  <input type="checkbox" aria-label={`Select ${population.id}`} onClick={(event) => event.stopPropagation()} />
                </RiskCell>
                <RiskCell strong>{population.id}</RiskCell>
                <RiskCell><span className="font-black text-slate-900">{population.title}</span></RiskCell>
                <RiskCell>{renderStatusPill(population, applicability, workspaceData)}</RiskCell>
                <RiskCell>{renderProgressStatusPill(population, workspaceData)}</RiskCell>
                <RiskCell>{population.owner}</RiskCell>
                <RiskCell>{population.dueDate}</RiskCell>
                <RiskCell>{population.category}</RiskCell>
                <RiskCell>{population.mappedTests}</RiskCell>
                <RiskCell>{population.comments}</RiskCell>
              </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredPopulations.length && <EmptyRows label="populations" />}
      </div>
    </section>
  );
}

class WorkspaceErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Implementation workspace failed to render", error, info);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.itemKey !== this.props.itemKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <aside className="h-full min-w-0 overflow-y-auto bg-white p-5">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-rose-500">Panel Error</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Details could not load</h2>
          </div>
          <button
            type="button"
            onClick={this.props.onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close details panel"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-4">
          <p className="text-sm font-bold text-rose-800">
            The table is okay, but this record has saved data the details panel cannot display yet.
          </p>
          <p className="mt-3 break-words text-xs font-semibold leading-5 text-rose-700">
            {safeDisplayText(this.state.error?.message, "Unknown render error")}
          </p>
        </div>
      </aside>
    );
  }
}

function ImplementationWorkspace({ item, framework, data, savedState = {}, onWorkspaceStateChange, onClose, relationshipGraph, onNavigateRelatedItem }) {
  const { user } = useUser();
  const state = savedState || {};
  const graphLinkedItems = useMemo(
    () => getLinkedItemsFromGraph(item, data, relationshipGraph),
    [data, item, relationshipGraph]
  );
  const linkedItems = useMemo(
    () => resolveLinkedItemsWithOverrides(graphLinkedItems, data, state),
    [data, graphLinkedItems, state]
  );
  const frameworkBadge = framework?.shortName || framework?.name || "Framework";
  const [organizationStatus, setOrganizationStatus] = useState(state.status || "");
  const [dueDate, setDueDate] = useState(state.dueDate || "");
  const [linkingSection, setLinkingSection] = useState("");
  const [linkSelection, setLinkSelection] = useState("");
  const [assignments, setAssignments] = useState({
    owner: safeDisplayText(state.assignments?.owner, "Unassigned"),
    reviewer: safeDisplayText(state.assignments?.reviewer, "Unassigned"),
    approver: safeDisplayText(state.assignments?.approver, "Unassigned"),
  });
  const evidenceFiles = normalizeRelationshipList(state.evidenceFiles);
  const evidenceByRequirement = state.evidenceByRequirement && typeof state.evidenceByRequirement === "object" ? state.evidenceByRequirement : {};
  const linkedEvidenceIds = normalizeRelationshipList(state.linkedEvidenceIds);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(() => normalizeRelationshipList(state.comments));
  const [timeline, setTimeline] = useState(() => normalizeRelationshipList(state.timeline));
  const tasks = normalizeRelationshipList(state.tasks);
  const {
    audit,
    evidenceStore,
    policies: centralPolicies,
    questionnaireResponses: centralQuestionnaireResponses,
    tasks: centralTasks,
    actions,
  } = useComplianceState();
  const evidenceRecords = evidenceStore.records;
  const setEvidenceRecords = actions.saveEvidenceRecords;
  const relationshipDetails = useMemo(
    () =>
      buildImplementationRelationshipDetails({
        item,
        linkedItems,
        data,
        evidenceRecords,
        audit,
        tasks: centralTasks,
        policies: centralPolicies,
        questionnaireResponses: centralQuestionnaireResponses,
        workspaceState: state,
      }),
    [audit, centralPolicies, centralQuestionnaireResponses, centralTasks, data, evidenceRecords, item, linkedItems, state]
  );
  const navigateRelated = (type, relatedItem, mode = "resolve") => {
    if (!onNavigateRelatedItem) return;
    onNavigateRelatedItem(type, relatedItem, { mode });
  };

  const getLinkedIds = (family) =>
    normalizeRelationshipList(linkedItems[family]).map((relatedItem) => safeDisplayText(relatedItem.id)).filter(Boolean);

  const getAvailableLinkOptions = (family) => {
    const linkedIds = new Set(getLinkedIds(family));
    return normalizeRelationshipList(data?.[family])
      .filter((candidate) => {
        const id = safeDisplayText(candidate.id || candidate.name);
        return id && !linkedIds.has(id) && id !== safeDisplayText(item.id);
      })
      .map((candidate) => ({
        id: safeDisplayText(candidate.id || candidate.name),
        label: safeDisplayText(candidate.title || candidate.name || candidate.id, "Untitled"),
      }));
  };

  const openLinkPicker = (family) => {
    setLinkingSection((current) => (current === family ? "" : family));
    setLinkSelection("");
  };

  const linkRelatedItem = (family, relatedId) => {
    const key = linkedStateKeyByFamily[family];
    if (!key || !relatedId) return;

    const nextIds = [...new Set([...getLinkedIds(family), relatedId])];
    setLinkingSection("");
    setLinkSelection("");
    addTimelineEvent(`Linked ${singularRelationshipLabel(family)}`, { [key]: nextIds });
  };

  const unlinkRelatedItem = (family, relatedId) => {
    const key = linkedStateKeyByFamily[family];
    if (!key || !relatedId) return;

    const nextIds = getLinkedIds(family).filter((id) => id !== relatedId);
    addTimelineEvent(`Unlinked ${singularRelationshipLabel(family)}`, { [key]: nextIds });
  };

  const renderLinkPicker = (family) => {
    if (linkingSection !== family) return null;

    const options = getAvailableLinkOptions(family);
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
        {options.length ? (
          <>
            <select
              value={linkSelection}
              onChange={(event) => setLinkSelection(event.target.value)}
              className="h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="">Select {singularRelationshipLabel(family).toLowerCase()}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.id} - {option.label}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLinkingSection("")}
                className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!linkSelection}
                onClick={() => linkRelatedItem(family, linkSelection)}
                className="rounded bg-slate-900 px-3 py-1 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Add
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs font-semibold text-slate-400">No available items to link.</p>
        )}
      </div>
    );
  };

  const renderLinkedCard = (family, relatedItem, typeLabel, options = {}) => (
    <div key={relatedItem.id} className={options.className || "rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-3"}>
      <button
        type="button"
        onClick={() => navigateRelated(typeLabel, relatedItem)}
        className="block w-full text-left text-sm font-black text-slate-900 hover:text-blue-700"
      >
        {safeDisplayText(relatedItem.title || relatedItem.name || relatedItem.id, typeLabel)}
      </button>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-500">{safeDisplayText(relatedItem.id)}</span>
        <div className="flex items-center gap-3">
          {options.badge && (
            <span className={options.badgeClassName || "rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 uppercase"}>
              {options.badge}
            </span>
          )}
          <button
            type="button"
            onClick={() => unlinkRelatedItem(family, relatedItem.id)}
            className="text-xs font-black text-blue-600 hover:text-blue-700 hover:underline"
          >
            Unlink
          </button>
        </div>
      </div>
    </div>
  );

  // Load dynamic employee list (no fake fallbacks)
  const employeesList = useMemo(() => {
    try {
      const list = readScopedJson("spectramind:employees", []);
      const names = list.map((emp) => safeDisplayText(emp.name)).filter(Boolean);
      if (!names.includes("Unassigned")) names.push("Unassigned");
      return names;
    } catch {
      return ["Unassigned"];
    }
  }, []);

  // Risk Parameters
  const [initialLikelihood, setInitialLikelihood] = useState(state.initialLikelihood ?? 3);
  const [initialImpact, setInitialImpact] = useState(state.initialImpact ?? 5);
  const [treatment, setTreatment] = useState(state.treatment ?? "Minimize");
  const [residualLikelihood, setResidualLikelihood] = useState(state.residualLikelihood ?? 1);
  const [residualImpact, setResidualImpact] = useState(state.residualImpact ?? 3);

  const saveWorkspaceState = (overrides = {}) => {
    onWorkspaceStateChange(item.id, {
      status: organizationStatus,
      dueDate,
      assignments,
      evidenceFiles,
      evidenceByRequirement,
      linkedEvidenceIds,
      comments,
      timeline,
      tasks,
      ...getSavedLinkedOverrides(state),
      initialLikelihood,
      initialImpact,
      treatment,
      residualLikelihood,
      residualImpact,
      ...overrides,
    });
  };

  const handleEvidenceChange = (linkedEvidence) => {
    const nextEvidenceFiles = linkedEvidence.map((record) => {
      const version = record.versions?.find((candidate) => candidate.id === record.currentVersionId) || record.versions?.at(-1);
      return {
        id: record.id,
        name: version?.fileName || record.title,
        status: record.evidenceStatus || "Pending Review",
        version: version?.versionNumber || 1,
        uploadedAt: version?.uploadedAt || record.createdAt,
      };
    });
    const nextEvidenceIds = nextEvidenceFiles.map((evidence) => evidence.id);
    const nextTimeline = [
      { id: `evidence-${Date.now()}`, label: "Evidence updated" },
      ...timeline,
    ];

    setTimeline(nextTimeline);
    saveWorkspaceState({
      status: nextEvidenceFiles.length ? "Pending Review" : organizationStatus,
      evidenceFiles: nextEvidenceFiles,
      linkedEvidenceIds: nextEvidenceIds,
      evidenceCount: nextEvidenceFiles.length,
      timeline: nextTimeline,
    });

    for (const control of linkedItems.controls || []) {
      onWorkspaceStateChange(control.id, {
        evidenceCount: nextEvidenceFiles.length,
        linkedEvidenceIds: nextEvidenceIds,
        evidenceFiles: nextEvidenceFiles,
        evidenceStatus: nextEvidenceFiles.length ? "Pending Review" : "Missing",
      });
    }
  };

  const addTimelineEvent = (label, stateOverrides = {}) => {
    const nextTimeline = [
      { id: `${timeline.length + 1}-${label}-${Date.now()}`, label },
      ...timeline,
    ];
    setTimeline(nextTimeline);
    saveWorkspaceState({ ...stateOverrides, timeline: nextTimeline });
  };

  const updateOrganizationStatus = (value) => {
    setOrganizationStatus(value);
    addTimelineEvent("Status updated", { status: value });
  };

  const updateDueDate = (value) => {
    setDueDate(value);
    addTimelineEvent("Due date updated", { dueDate: value });
  };

  const updateAssignment = (field, value) => {
    const nextAssignments = { ...assignments, [field]: value };
    setAssignments(nextAssignments);
    addTimelineEvent(`${fieldLabel(field)} updated`, { assignments: nextAssignments });
  };

  const handleRiskParamChange = (params) => {
    const nextParams = {
      initialLikelihood,
      initialImpact,
      treatment,
      residualLikelihood,
      residualImpact,
      ...params,
    };
    if (params.initialLikelihood !== undefined) setInitialLikelihood(params.initialLikelihood);
    if (params.initialImpact !== undefined) setInitialImpact(params.initialImpact);
    if (params.treatment !== undefined) setTreatment(params.treatment);
    if (params.residualLikelihood !== undefined) setResidualLikelihood(params.residualLikelihood);
    if (params.residualImpact !== undefined) setResidualImpact(params.residualImpact);

    saveWorkspaceState(nextParams);
    addTimelineEvent("Risk parameters updated", nextParams);
  };

  const addComment = () => {
    const trimmedComment = commentText.trim();
    if (!trimmedComment) return;
    const newCommentObj = {
      id: `comment-${Date.now()}`,
      user: user?.name || "User",
      text: trimmedComment,
      timestamp: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    };
    const nextComments = [newCommentObj, ...comments];
    setComments(nextComments);
    setCommentText("");
    addTimelineEvent("Comment added", { comments: nextComments });
  };

  const renderComment = (comment, index) => {
    const isObj = typeof comment === "object" && comment !== null;
    const userName = isObj ? comment.user : "User";
    const userLabel = safeDisplayText(userName, "User");
    const userInitial = userLabel[0] || "U";
    const text = safeDisplayText(isObj ? comment.text : comment);
    const time = safeDisplayText(isObj ? comment.timestamp : "Just now", "Just now");

    return (
      <div key={index} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700 uppercase">
              {userInitial}
            </span>
            <div>
              <p className="text-xs font-black text-slate-900">{userLabel}</p>
              <p className="text-[10px] font-bold text-slate-400">{time}</p>
            </div>
          </div>
        </div>
        <p className="text-xs leading-5 text-slate-600 font-semibold">{text}</p>
      </div>
    );
  };

  const renderRelationshipExtras = () => (
    <>
      <RelationshipSummaryBadges details={relationshipDetails} onNavigate={navigateRelated} />
      <RelatedSection
        title="Connected Policies"
        items={relationshipDetails.policies}
        emptyLabel="No connected policies."
        onOpen={(policy) => navigateRelated("Policy", policy)}
      />
      <RelatedSection
        title="Connected Evidence"
        items={relationshipDetails.evidence}
        emptyLabel="No connected evidence."
        onOpen={(evidence) => navigateRelated("Evidence", evidence)}
      />
      <RelatedSection
        title="Open Tasks"
        items={relationshipDetails.tasks}
        emptyLabel="No open tasks."
        onOpen={(task) => navigateRelated("Task", task)}
      />
      <RelatedSection
        title="Audit Findings"
        items={relationshipDetails.auditFindings}
        emptyLabel="No open audit findings."
        onOpen={(finding) => navigateRelated(auditFindingToItemType(finding), { id: finding.relatedItemId }, "view")}
      />
      <RelatedSection
        title="Recent Activity"
        items={relationshipDetails.activity}
        emptyLabel="No recent activity."
        readOnly
      />
    </>
  );

  // ── 1. TEST DRAWER LAYOUT ──────────────────────────────────────────────────
  if (item.type === "Test") {
    const progressStatus = getProgressStatus(item, { [item.id]: state });
    const isCompleted = progressStatus === "Completed";

    return (
      <aside className="h-full min-w-0 overflow-y-auto bg-white p-5 space-y-6 w-full">
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 uppercase tracking-wide">
                {isCompleted ? "COMPLETED" : "READY"}
              </span>
              <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 uppercase tracking-wide">
                {frameworkBadge}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-950">
              {safeDisplayText(item.id, "Test").replace("TEST-", "Test ")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-750"
          >
            <X size={18} />
          </button>
        </div>

        {/* Guidance Callout Box */}
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Guidance</h4>
          <p className="mt-2 text-sm leading-6 text-indigo-950/90">
            {safeDisplayText(item.guidance, "Provide documentation showing that your organization completed a physical access review within the last 12 months.")}
          </p>
        </div>

        {/* Completion Section */}
        <div className="space-y-2 border-b border-slate-100 pb-5">
          <CompletionStatusControl
            typeLabel="test"
            isCompleted={isCompleted}
            onComplete={() => updateOrganizationStatus("Completed")}
            onReopen={() => updateOrganizationStatus("In Progress")}
          />
        </div>

        {/* Details Section */}
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Details</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Assigned</span>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-black text-blue-700 uppercase">
                  {assignments.owner[0]}
                </span>
                <select
                  value={assignments.owner}
                  onChange={(e) => updateAssignment("owner", e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {employeesList.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Due Date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => updateDueDate(e.target.value)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-bold text-slate-700 outline-none text-xs"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Category</span>
              <span className="font-bold text-slate-800">{safeDisplayText(item.category, "General")}</span>
            </div>
          </div>
        </div>

        {renderRelationshipExtras()}

        {/* Mapped Controls Section */}
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Mapped Controls</h4>
            <button
              type="button"
              onClick={() => openLinkPicker("controls")}
              className="rounded border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Link
            </button>
          </div>
          {renderLinkPicker("controls")}
          {linkedItems.controls?.map((ctrl) =>
            renderLinkedCard("controls", ctrl, "Control", { badge: "Implemented" })
          )}
          {!linkedItems.controls?.length && (
            <p className="text-xs font-semibold text-slate-400 italic">No mapped controls.</p>
          )}
        </div>

        <EvidenceManagementSection
          context={buildEvidenceContext({ item, linkedItems, framework, frameworkBadge })}
          records={evidenceRecords}
          onRecordsChange={setEvidenceRecords}
          onEvidenceChange={handleEvidenceChange}
        />

        {/* History Section */}
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">History</h4>
          <div className="space-y-3">
            {/* Custom comments list */}
            {comments.map((comment, index) => renderComment(comment, index))}

            {!comments.length && (
              <p className="py-2 text-center text-xs font-semibold text-slate-400">There are no comments yet</p>
            )}
          </div>
        </div>

        {/* Comment Editor Box */}
        <div className="space-y-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full min-h-20 rounded-lg border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-500"
          />
          <div className="flex items-center justify-between">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
              Unassigned
              <ChevronDown size={14} />
            </button>
            <button
              onClick={addComment}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // ── 2. CONTROL DRAWER LAYOUT ───────────────────────────────────────────────
  if (item.type === "Control") {
    const progressStatus = getProgressStatus(item, { [item.id]: state });
    const isImplemented = progressStatus === "Completed";

    return (
      <aside className="h-full min-w-0 overflow-y-auto bg-white p-5 space-y-6 w-full">
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 uppercase tracking-wide">
                {isImplemented ? "IMPLEMENTED" : "IN PROGRESS"}
              </span>
              <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 uppercase tracking-wide">
                {frameworkBadge}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-950">
              {safeDisplayText(item.id)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-750"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description Section */}
        <div className="space-y-2 border-b border-slate-100 pb-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Description</h4>
          <p className="text-sm leading-6 text-slate-700">
            {safeDisplayText(item.description)}
          </p>
        </div>

        {/* Details Section */}
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Details</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Assigned</span>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-black text-blue-700 uppercase">
                  {assignments.owner[0]}
                </span>
                <select
                  value={assignments.owner}
                  onChange={(e) => updateAssignment("owner", e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {employeesList.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Due Date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => updateDueDate(e.target.value)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-bold text-slate-700 outline-none text-xs"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Category</span>
              <span className="font-bold text-slate-800">{safeDisplayText(item.category, "Compliance")}</span>
            </div>
          </div>
        </div>

        {renderRelationshipExtras()}

        <div className="space-y-2 border-b border-slate-100 pb-5">
          <CompletionStatusControl
            typeLabel="control"
            isCompleted={isImplemented}
            onComplete={() => updateOrganizationStatus("Completed")}
            onReopen={() => updateOrganizationStatus("In Progress")}
          />
        </div>

        <EvidenceManagementSection
          context={buildEvidenceContext({ item, linkedItems, framework, frameworkBadge })}
          records={evidenceRecords}
          onRecordsChange={setEvidenceRecords}
          onEvidenceChange={handleEvidenceChange}
        />

        {/* Linked Tests Section */}
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Connected Tests</h4>
            <button
              type="button"
              onClick={() => openLinkPicker("tests")}
              className="rounded border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Link
            </button>
          </div>
          {renderLinkPicker("tests")}
          {linkedItems.tests?.map((t) =>
            renderLinkedCard("tests", t, "Test", {
              badge: "Ready",
              badgeClassName: "rounded bg-blue-50 px-2.5 py-0.5 text-[10px] font-black text-blue-700 uppercase",
            })
          )}
          {!linkedItems.tests?.length && (
            <p className="text-xs font-semibold text-slate-400 italic">No connected tests.</p>
          )}
        </div>

        {/* Linked Risk Scenarios Section */}
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Mitigated Risks</h4>
            <button
              type="button"
              onClick={() => openLinkPicker("risks")}
              className="rounded border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Link
            </button>
          </div>
          {renderLinkPicker("risks")}
          {linkedItems.risks?.map((r) =>
            renderLinkedCard("risks", r, "Risk", {
              badge: "Mitigated",
              badgeClassName: "rounded bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700",
            })
          )}
          {!linkedItems.risks?.length && (
            <p className="text-xs font-semibold text-slate-400 italic">No mitigated risks.</p>
          )}
        </div>

        {/* Comment History Section */}
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">History</h4>
          <div className="space-y-3">
            {comments.map((comment, index) => renderComment(comment, index))}
            {!comments.length && (
              <p className="py-2 text-center text-xs font-semibold text-slate-400">There are no comments yet</p>
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div className="space-y-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full min-h-20 rounded-lg border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-500"
          />
          <div className="flex justify-end">
            <button
              onClick={addComment}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // ── 3. RISK SCENARIO DRAWER LAYOUT (MATCHES SCREENSHOT) ─────────────────────
  if (item.type === "Risk") {
    const progressStatus = getProgressStatus(item, { [item.id]: state });
    const isCompleted = progressStatus === "Completed";
    const initialRiskScore = initialLikelihood * initialImpact;
    const residualRiskScore = residualLikelihood * residualImpact;

    return (
      <aside className="h-full min-w-0 overflow-y-auto bg-white p-5 space-y-6 w-full">
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-slate-105 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black tracking-wide uppercase ${
                isCompleted ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700"
              }`}>
                {!isCompleted && (
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block mr-0.5" />
                )}
                {isCompleted ? "COMPLETED" : "READY"}
              </span>
              <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 uppercase tracking-wide">
                {frameworkBadge}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-950 mt-1">
              Risk Scenario {safeDisplayText(item.id)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-750"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description Section */}
        <div className="space-y-1">
          <p className="text-sm leading-6 text-slate-700">
            {safeDisplayText(item.description, "The absence or failure to ensure compliance with information security policies, rules, and standards...")}
          </p>
        </div>

        {/* Completion Action */}
        <div className="border-b border-slate-100 pb-4">
          <CompletionStatusControl
            typeLabel="risk scenario"
            isCompleted={isCompleted}
            onComplete={() => updateOrganizationStatus("Completed")}
            onReopen={() => updateOrganizationStatus("In Progress")}
          />
        </div>

        {/* Details Section */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 font-semibold text-xs uppercase">Assigned to</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white uppercase">
                  {assignments.owner[0]}
                </span>
                <select
                  value={assignments.owner}
                  onChange={(e) => updateAssignment("owner", e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {employeesList.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <p className="text-slate-400 font-semibold text-xs uppercase">Category</p>
              <p className="font-bold text-slate-800 mt-2">{safeDisplayText(item.category, "Operations")}</p>
            </div>
          </div>
        </div>

        {renderRelationshipExtras()}

        {/* Initial Risk Section */}
        <div className="rounded-xl border border-slate-150 p-4 space-y-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900">Initial Risk</h4>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">
              {initialRiskScore}
            </span>
          </div>

          {/* Likelihood Slider */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-850">Likelihood:</p>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={initialLikelihood}
              disabled={isCompleted}
              onChange={(e) => handleRiskParamChange({ initialLikelihood: parseInt(e.target.value) })}
              className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-indigo-650 ${
                isCompleted ? "bg-slate-100 cursor-not-allowed" : "bg-indigo-100"
              }`}
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 mt-1">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          {/* Impact Slider */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-850">Impact:</p>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={initialImpact}
              disabled={isCompleted}
              onChange={(e) => handleRiskParamChange({ initialImpact: parseInt(e.target.value) })}
              className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-indigo-650 ${
                isCompleted ? "bg-slate-100 cursor-not-allowed" : "bg-indigo-100"
              }`}
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 mt-1">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        </div>

        {/* Treatment Radios */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <h4 className="text-sm font-black text-slate-900">Treatment</h4>
            <span className="text-slate-400 cursor-help">ℹ️</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
            {["Tolerate", "Eliminate", "Minimize", "Outsource"].map((option) => (
              <label key={option} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="risk-treatment"
                  value={option}
                  disabled={isCompleted}
                  checked={treatment === option}
                  onChange={() => handleRiskParamChange({ treatment: option })}
                  className="h-4 w-4 text-indigo-650 border-indigo-350 focus:ring-indigo-500 cursor-pointer"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        {/* Residual Risk Section */}
        <div className="rounded-xl border border-slate-150 p-4 space-y-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900">Residual Risk</h4>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">
              {residualRiskScore}
            </span>
          </div>

          {/* Likelihood Slider */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-850">Likelihood:</p>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={residualLikelihood}
              disabled={isCompleted}
              onChange={(e) => handleRiskParamChange({ residualLikelihood: parseInt(e.target.value) })}
              className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-indigo-650 ${
                isCompleted ? "bg-slate-100 cursor-not-allowed" : "bg-indigo-100"
              }`}
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 mt-1">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          {/* Impact Slider */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-850">Impact:</p>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={residualImpact}
              disabled={isCompleted}
              onChange={(e) => handleRiskParamChange({ residualImpact: parseInt(e.target.value) })}
              className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-indigo-650 ${
                isCompleted ? "bg-slate-100 cursor-not-allowed" : "bg-indigo-100"
              }`}
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 mt-1">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        </div>

        {/* Mapped Controls Section */}
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Mapped Controls</h4>
            <button
              type="button"
              onClick={() => openLinkPicker("controls")}
              className="rounded bg-slate-900 border border-slate-900 px-3 py-1 text-xs font-black text-white hover:bg-slate-800"
            >
              Link
            </button>
          </div>
          {renderLinkPicker("controls")}
          {linkedItems.controls?.map((ctrl) =>
            renderLinkedCard("controls", ctrl, "Control", {
              badge: "Implemented",
              className: "rounded-lg border border-slate-150 p-4 space-y-3.5 bg-white",
              badgeClassName: "rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-black text-indigo-700 uppercase",
            })
          )}
          {!linkedItems.controls?.length && (
            <p className="text-xs font-semibold text-slate-400 italic">No mapped controls.</p>
          )}
        </div>

        <EvidenceManagementSection
          context={buildEvidenceContext({ item, linkedItems, framework, frameworkBadge })}
          records={evidenceRecords}
          onRecordsChange={setEvidenceRecords}
          onEvidenceChange={handleEvidenceChange}
        />

        {/* History / Comment Timeline Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">History</h4>
          <div className="space-y-3">
            {comments.map((comment, index) => renderComment(comment, index))}
            {!comments.length && (
              <p className="py-8 text-center text-xs font-semibold text-slate-400">There are no comments yet</p>
            )}
          </div>
        </div>

        {/* Comment Editor Box */}
        <div className="space-y-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full min-h-20 rounded-lg border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-500"
          />
          <div className="flex justify-end">
            <button
              onClick={addComment}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (item.type === "Population") {
    const progressStatus = getProgressStatus(item, { [item.id]: state });
    const isCompleted = progressStatus === "Completed";

    return (
      <aside className="h-full min-w-0 overflow-y-auto bg-white p-5 space-y-6 w-full">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                isCompleted ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
              }`}>
                {isCompleted ? "COMPLETED" : "IN PROGRESS"}
              </span>
              <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                {frameworkBadge}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-950">
              {safeDisplayText(item.title || item.name || item.id, "Population")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-750"
            aria-label="Close details panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 border-b border-slate-100 pb-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Description</h4>
          <p className="text-sm leading-6 text-slate-700">
            {safeDisplayText(item.description || item.title, "Review this scoped population and keep ownership, due date, evidence, and linked tests current.")}
          </p>
        </div>

        <div className="space-y-2 border-b border-slate-100 pb-5">
          <CompletionStatusControl
            typeLabel="population"
            isCompleted={isCompleted}
            onComplete={() => updateOrganizationStatus("Completed")}
            onReopen={() => updateOrganizationStatus("In Progress")}
          />
        </div>

        <div className="space-y-3 border-b border-slate-100 pb-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Details</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Assigned</span>
              <select
                value={assignments.owner}
                onChange={(event) => updateAssignment("owner", event.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                {employeesList.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Due Date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => updateDueDate(event.target.value)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Category</span>
              <span className="font-bold text-slate-800">{safeDisplayText(item.category, "Population Management")}</span>
            </div>
          </div>
        </div>

        {renderRelationshipExtras()}

        <div className="space-y-3 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Connected Tests</h4>
            <button
              type="button"
              onClick={() => openLinkPicker("tests")}
              className="rounded border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Link
            </button>
          </div>
          {renderLinkPicker("tests")}
          {linkedItems.tests?.map((test) =>
            renderLinkedCard("tests", test, "Test", {
              badge: "Ready",
              badgeClassName: "rounded bg-blue-50 px-2.5 py-0.5 text-[10px] font-black text-blue-700 uppercase",
            })
          )}
          {!linkedItems.tests?.length && (
            <p className="text-xs font-semibold text-slate-400 italic">No connected tests.</p>
          )}
        </div>

        <div className="space-y-3 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Mapped Controls</h4>
            <button
              type="button"
              onClick={() => openLinkPicker("controls")}
              className="rounded border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Link
            </button>
          </div>
          {renderLinkPicker("controls")}
          {linkedItems.controls?.map((control) =>
            renderLinkedCard("controls", control, "Control", { badge: "Implemented" })
          )}
          {!linkedItems.controls?.length && (
            <p className="text-xs font-semibold text-slate-400 italic">No mapped controls.</p>
          )}
        </div>

        <EvidenceManagementSection
          context={buildEvidenceContext({ item, linkedItems, framework, frameworkBadge })}
          records={evidenceRecords}
          onRecordsChange={setEvidenceRecords}
          onEvidenceChange={handleEvidenceChange}
        />

        <div className="space-y-3 border-b border-slate-100 pb-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">History</h4>
          {comments.map((comment, index) => renderComment(comment, index))}
          {!comments.length && (
            <p className="py-2 text-center text-xs font-semibold text-slate-400">There are no comments yet</p>
          )}
        </div>

        <div className="space-y-3">
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Write a comment..."
            className="w-full min-h-20 rounded-lg border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-500"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addComment}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (item.type === "Policy") {
    const isReady = ["ready", "approved", "implemented", "complete", "completed"].includes(
      String(organizationStatus).toLowerCase()
    );
    const uploadUrl = `/implementation/mandatory-documents/${encodeURIComponent(item.id)}/upload?framework=${framework?.slug || "iso-27001"}`;

    return (
      <aside className="h-full min-w-0 overflow-y-auto bg-white p-5 space-y-6 w-full">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                isReady ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"
              }`}>
                {isReady ? "READY" : "NOT READY"}
              </span>
              <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                {frameworkBadge}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-950">
              {safeDisplayText(item.title || item.name || item.id, "Policy")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-750"
            aria-label="Close details panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-700">Mandatory Document</h4>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {safeDisplayText(item.description, `Upload and maintain the ${safeDisplayText(item.title || item.name || item.id, "selected")} document for the selected framework.`)}
          </p>
        </div>

        <Link
          to={uploadUrl}
          state={{ document: item, framework }}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
        >
          <UploadCloud size={17} />
          Upload Document
        </Link>

        <div className="grid gap-3 border-b border-slate-100 pb-5 text-sm">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Details</h4>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Assigned to</span>
            <select
              value={assignments.owner}
              onChange={(e) => updateAssignment("owner", e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              {employeesList.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Due Date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => updateDueDate(e.target.value)}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Category</span>
            <span className="font-bold text-slate-800">{safeDisplayText(item.category, "Mandatory Docs")}</span>
          </div>
        </div>

        <div className="space-y-3 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Uploaded Documents</h4>
            <button
              type="button"
              onClick={() => updateOrganizationStatus("Ready")}
              className="rounded border border-slate-200 px-2 py-1 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              Mark Ready
            </button>
          </div>
          {evidenceFiles.length ? (
            <div className="space-y-2">
              {evidenceFiles.map((file) => (
                <div key={file.id || file.name} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <FileText size={16} className="text-blue-600" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{safeDisplayText(file.name, "Document")}</p>
                    <p className="text-xs font-semibold text-slate-400">{safeDisplayText(file.uploadedAt, "Uploaded")}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center text-xs font-semibold text-slate-400">
              No documents uploaded yet.
            </p>
          )}
        </div>

        <div className="space-y-3 border-b border-slate-100 pb-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Mapped Controls</h4>
          {linkedItems.controls?.length ? (
            linkedItems.controls.map((ctrl) => (
              <div key={ctrl.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-black text-slate-900">{safeDisplayText(ctrl.title || ctrl.name || ctrl.id, "Control")}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{safeDisplayText(ctrl.id)}</p>
              </div>
            ))
          ) : (
            <p className="text-xs font-semibold text-slate-400 italic">No mapped controls.</p>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">History</h4>
          {comments.map((comment, index) => renderComment(comment, index))}
          {!comments.length && (
            <p className="py-6 text-center text-xs font-semibold text-slate-400">There are no comments yet</p>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-full min-w-0 overflow-y-auto bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Library · {framework.name}
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            {safeDisplayText(item.id)}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close details panel"
        >
          <X size={18} />
        </button>
      </div>
    </aside>
  );
}

function buildEvidenceContext({ item, linkedItems, framework, frameworkBadge }) {
  const itemType = String(item.type || "").toLowerCase();
  const linkedControlIds = normalizeRelationshipList(linkedItems.controls).map((control) => safeDisplayText(control.id)).filter(Boolean);
  const itemLinkedControlIds = normalizeRelationshipList(item.linkedControls).map((controlId) => safeDisplayText(controlId)).filter(Boolean);
  const controlIds = itemType === "control"
    ? [safeDisplayText(item.id)].filter(Boolean)
    : [...new Set([...linkedControlIds, ...itemLinkedControlIds])];

  return {
    frameworkId: framework?.id || framework?.slug || frameworkBadge,
    domain: safeDisplayText(item.category || item.domain || item.annexDomain, "General"),
    controlIds,
    testId: itemType === "test" ? safeDisplayText(item.id) : "",
    implementationId: safeDisplayText(item.id),
  };
}

function CompletionStatusControl({ typeLabel, isCompleted, onComplete, onReopen }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-900">
            {isCompleted ? `This ${typeLabel} is completed` : `Mark this ${typeLabel} as completed`}
          </h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {isCompleted
              ? "Completed items appear as completed in the implementation table."
              : "Use this when the work for this item is finished."}
          </p>
        </div>
        {isCompleted ? (
          <span className="shrink-0 rounded bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
            Completed
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={isCompleted ? onReopen : onComplete}
        className={`rounded-lg px-4 py-2 text-xs font-black transition ${
          isCompleted
            ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {isCompleted ? "Mark as In Progress" : "Mark as Completed"}
      </button>
    </div>
  );
}

function RelationshipSummaryBadges({ details, onNavigate }) {
  const summaries = [
    { label: "Policies", count: details.policies.length, type: "Policy", item: details.policies[0] },
    { label: "Evidence", count: details.evidence.length, type: "Evidence", item: details.evidence[0] },
    { label: "Tasks", count: details.tasks.length, type: "Task", item: details.tasks[0] },
    { label: "Findings", count: details.auditFindings.length, type: "Audit", item: details.auditFindings[0] },
  ];

  if (!summaries.some((summary) => summary.count)) return null;

  return (
    <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-5">
      {summaries.map((summary) => (
        <button
          key={summary.label}
          type="button"
          disabled={!summary.count || !summary.item}
          onClick={() => summary.item && onNavigate?.(summary.type, summary.item, "view")}
          className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-left transition hover:bg-blue-50 disabled:cursor-default disabled:hover:bg-slate-50/70"
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{summary.label}</p>
          <p className="mt-1 text-lg font-black text-slate-900">{summary.count}</p>
        </button>
      ))}
    </div>
  );
}

function RelatedSection({ title, items, emptyLabel, onOpen, readOnly = false }) {
  return (
    <div className="space-y-3 border-b border-slate-100 pb-5">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</h4>
      {items.length ? (
        items.slice(0, 4).map((relatedItem) => {
          const body = relatedItem.description || relatedItem.summary || relatedItem.reason || relatedItem.status || relatedItem.id;
          const titleText = safeDisplayText(relatedItem.title || relatedItem.name || relatedItem.id, "Related item");
          const statusText = safeDisplayText(relatedItem.status);
          const bodyText = safeDisplayText(body);
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-black text-slate-900">{titleText}</p>
                {statusText ? (
                  <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">
                    {statusText}
                  </span>
                ) : null}
              </div>
              {bodyText ? <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{bodyText}</p> : null}
            </>
          );

          if (readOnly) {
            return (
              <div key={relatedItem.id || relatedItem.title} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                {content}
              </div>
            );
          }

          return (
            <button
              key={relatedItem.id || relatedItem.title}
              type="button"
              onClick={() => onOpen?.(relatedItem)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-left transition hover:bg-blue-50/40"
            >
              {content}
            </button>
          );
        })
      ) : (
        <p className="text-xs font-semibold italic text-slate-400">{emptyLabel}</p>
      )}
    </div>
  );
}

function buildImplementationRelationshipDetails({
  item,
  linkedItems,
  data,
  evidenceRecords,
  audit,
  tasks,
  policies,
  questionnaireResponses,
  workspaceState,
}) {
  const relatedIds = collectRelatedIds(item, linkedItems, workspaceState);
  const policyRows = uniqueById([
    ...normalizeRelationshipList(linkedItems.policies),
    ...normalizeRelationshipList(data.policies).filter((policy) => relatedIds.has(policy.id) || intersects(policy.linkedControls, relatedIds)),
    ...normalizeRelationshipList(policies).filter((policy) => relatedIds.has(policy.id) || intersects(policy.linkedControls || policy.relatedControls, relatedIds)),
  ]).map((policy) => ({
    id: safeDisplayText(policy.id),
    title: safeDisplayText(policy.title || policy.name || policy.id, "Policy"),
    status: safeDisplayText(policy.status || policy.approvalStatus || "Policy"),
    description: safeDisplayText(policy.description || policy.summary),
  }));

  return {
    policies: policyRows,
    evidence: collectRelatedEvidence(evidenceRecords, relatedIds, item),
    questionnaire: collectQuestionnaireAnswers(questionnaireResponses, relatedIds, item),
    tasks: collectRelatedTasks(tasks, relatedIds, item),
    auditFindings: collectAuditFindings(audit, relatedIds, item),
    activity: collectActivity(workspaceState, item),
  };
}

function collectRelatedIds(item, linkedItems, workspaceState) {
  return new Set([
    item.id,
    ...normalizeRelationshipList(item.linkedControls),
    ...normalizeRelationshipList(item.linkedTests),
    ...normalizeRelationshipList(item.linkedRisks),
    ...normalizeRelationshipList(item.linkedPolicies),
    ...normalizeRelationshipList(workspaceState?.linkedEvidenceIds),
    ...normalizeRelationshipList(linkedItems.controls).map((control) => control.id),
    ...normalizeRelationshipList(linkedItems.tests).map((test) => test.id),
    ...normalizeRelationshipList(linkedItems.risks).map((risk) => risk.id),
    ...normalizeRelationshipList(linkedItems.policies).map((policy) => policy.id),
  ].filter(Boolean));
}

function collectRelatedEvidence(records = [], relatedIds, item) {
  return records
    .filter((record) => {
      const metadata = record.metadata || {};
      const mappings = Array.isArray(record.mappings) ? record.mappings : [];
      const recordLinks = [
        record.id,
        metadata.linkedTest,
        metadata.linkedImplementation,
        metadata.linkedPolicy,
        ...normalizeRelationshipList(metadata.linkedControls),
        ...mappings.flatMap((mapping) => [mapping.controlId, mapping.testId, mapping.policyId]),
      ].filter(Boolean);
      return recordLinks.some((id) => relatedIds.has(id)) || metadata.linkedTest === item.id;
    })
    .map((record) => ({
      id: safeDisplayText(record.id),
      title: safeDisplayText(record.title || record.versions?.at(-1)?.fileName || record.id, "Evidence"),
      status: safeDisplayText(record.evidenceStatus || "Evidence"),
      description: safeDisplayText(record.description || record.metadata?.linkedDomain),
    }));
}

function collectQuestionnaireAnswers(responses = {}, relatedIds, item) {
  return Object.entries(responses || {})
    .filter(([key, response]) => {
      const haystack = [
        key,
        response?.questionId,
        response?.controlId,
        response?.testId,
        response?.riskId,
        ...normalizeRelationshipList(response?.linkedControls),
        ...normalizeRelationshipList(response?.relatedControls),
      ].filter(Boolean);
      return haystack.some((id) => relatedIds.has(id)) || key.includes(item.id);
    })
    .map(([key, response]) => ({
      id: safeDisplayText(key),
      title: safeDisplayText(response?.question || response?.label || key, "Questionnaire answer"),
      status: safeDisplayText(response?.answer || response?.status || "Answer"),
      description: safeDisplayText(response?.notes || response?.reason),
    }));
}

function collectRelatedTasks(tasks = [], relatedIds, item) {
  return (tasks || [])
    .filter((task) => {
      const taskLinks = [
        task.id,
        task.itemId,
        task.controlId,
        task.testId,
        task.policyId,
        ...normalizeRelationshipList(task.linkedControls),
      ].filter(Boolean);
      return taskLinks.some((id) => relatedIds.has(id)) || task.itemId === item.id;
    })
    .map((task) => ({
      id: safeDisplayText(task.id),
      title: safeDisplayText(task.title || task.name || task.id, "Task"),
      status: safeDisplayText(task.status || "Open"),
      description: safeDisplayText(task.description || task.dueDate),
    }));
}

function collectAuditFindings(audit, relatedIds, item) {
  const findings = [
    ...normalizeRelationshipList(audit?.findings),
    ...normalizeRelationshipList(audit?.openFindings),
    ...normalizeRelationshipList(audit?.gaps),
    ...normalizeRelationshipList(audit?.missingEvidence),
  ];

  return findings
    .filter((finding) => {
      const findingLinks = [
        finding.id,
        finding.relatedItemId,
        finding.itemId,
        finding.controlId,
        finding.testId,
        ...normalizeRelationshipList(finding.linkedControls),
      ].filter(Boolean);
      return findingLinks.some((id) => relatedIds.has(id)) || finding.relatedItemId === item.id;
    })
    .map((finding) => ({
      id: safeDisplayText(finding.id || `${safeDisplayText(finding.relatedItemId || item.id)}-${safeDisplayText(finding.title || finding.reason || "finding")}`),
      relatedItemId: safeDisplayText(finding.relatedItemId || finding.itemId || finding.controlId || item.id),
      title: safeDisplayText(finding.title || finding.name || finding.reason || "Audit finding"),
      status: safeDisplayText(finding.status || finding.severity || "Open"),
      description: safeDisplayText(finding.description || finding.summary),
      type: safeDisplayText(finding.type || finding.itemType || "Audit"),
    }));
}

function collectActivity(workspaceState, item) {
  return [
    ...normalizeRelationshipList(workspaceState?.timeline),
    ...normalizeRelationshipList(item.activityTimeline),
  ].map((activity, index) => ({
    id: safeDisplayText(activity.id || `${item.id}-activity-${index}`),
    title: safeDisplayText(activity.label || activity.title || activity, "Activity"),
    status: safeDisplayText(activity.timestamp || activity.createdAt || "Activity"),
    description: safeDisplayText(activity.description),
  }));
}

function auditFindingToItemType(finding) {
  return finding.type && finding.type !== "Audit" ? finding.type : "Audit";
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function intersects(values = [], relatedIds) {
  return normalizeRelationshipList(values).some((value) => relatedIds.has(value));
}

function normalizeRelationshipList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === "object") return Object.values(value).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function safeDisplayText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return value.map((item) => safeDisplayText(item)).filter(Boolean).join(", ") || fallback;
  if (typeof value === "object") {
    return (
      safeDisplayText(value.label) ||
      safeDisplayText(value.title) ||
      safeDisplayText(value.name) ||
      safeDisplayText(value.id) ||
      fallback
    );
  }
  return fallback;
}


function RiskCell({ children, strong = false }) {
  return (
    <td
      className={`px-4 py-3 align-top ${
        strong ? "font-black text-blue-700" : "font-semibold text-slate-600"
      }`}
    >
      {children}
    </td>
  );
}

function fieldLabel(field) {
  return {
    owner: "Owner",
    reviewer: "Reviewer",
    approver: "Approver",
  }[field];
}

function RiskPill({ children, tone }) {
  const toneClass =
    tone === "High"
      ? "bg-rose-50 text-rose-700"
      : tone === "Medium"
        ? "bg-amber-50 text-amber-700"
        : tone === "Low"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-blue-50 text-blue-800";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${toneClass}`}>
      {children}
    </span>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div>
      <h2 className="text-xl font-black text-slate-900">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function EmptyRows({ label }) {
  return (
    <div className="border-t border-slate-100 bg-white px-6 py-10 text-center">
      <p className="text-sm font-black text-slate-900">No {label} available.</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        Reset the library or upload your company data from the section above.
      </p>
    </div>
  );
}

function progressFromRows(rows, predicate) {
  if (!rows.length) return 0;
  return Math.round((completedCount(rows, predicate) / rows.length) * 100);
}

function completedCount(rows, predicate) {
  return rows.filter(predicate).length;
}

function renderStatusPill(row, defaultApplicability, workspaceData) {
  const saved = (workspaceData && workspaceData[row.id]) || {};
  const status = String(saved.status || row.status || "").toLowerCase();

  if (status === "not_applicable" || status === "not applicable") {
    return <RiskPill tone="Medium">Not Applicable</RiskPill>;
  }
  if (defaultApplicability === "Not applicable") {
    return <RiskPill tone="Medium">Not Applicable</RiskPill>;
  }
  return <RiskPill>Applicable</RiskPill>;
}

function renderProgressStatusPill(row, workspaceData) {
  const progressStatus = getProgressStatus(row, workspaceData);
  const tone = progressStatus === "Completed" ? "Low" : progressStatus === "Delayed" ? "High" : "Default";
  return <RiskPill tone={tone}>{progressStatus}</RiskPill>;
}

function getProgressStatus(row, workspaceData) {
  const saved = (workspaceData && workspaceData[row.id]) || {};
  const rawStatus = String(saved.status || row.status || "").toLowerCase().trim();

  if (["complete", "completed", "implemented", "approved"].includes(rawStatus)) {
    return "Completed";
  }

  const dueDateValue = saved.dueDate || row.dueDate;
  if (isPastDue(dueDateValue)) {
    return "Delayed";
  }

  return "In Progress";
}

function isPastDue(value) {
  if (!value) return false;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function getMandatoryDocStatus(document, workspaceData) {
  const status = String((workspaceData && workspaceData[document.id]?.status) || "").toLowerCase();
  if (["ready", "approved", "implemented", "complete", "completed"].includes(status)) return "READY";
  return "NOT READY";
}

function isCompletedStatus(row, workspaceData) {
  return ["complete", "completed", "implemented", "ready", "approved"].includes(
    String((workspaceData && workspaceData[row.id]?.status) || "").toLowerCase()
  );
}

function isApprovedStatus(row, workspaceData) {

  return ["approved", "complete", "completed"].includes(
    String((workspaceData && workspaceData[row.id]?.status) || "").toLowerCase()
  );
}

function hasUploadedEvidence(row, workspaceData) {
  if (!workspaceData) return false;
  const itemData = workspaceData[row.id];
  if (!itemData) return false;
  return Boolean(
    itemData.evidenceFiles?.length ||
      Object.values(itemData.evidenceByRequirement || {}).some((files) => files.length)
  );
}

function compareRiskRows(a, b, sortBy) {
  const severityRank = {
    High: 1,
    Medium: 2,
    Low: 3,
  };

  if (sortBy === "severity") {
    return severityRank[a.severity] - severityRank[b.severity];
  }

  if (sortBy === "dueDate") {
    return new Date(a.dueDate) - new Date(b.dueDate);
  }

  return String(a[sortBy]).localeCompare(String(b[sortBy]), undefined, {
    numeric: true,
  });
}

function compareControlRows(a, b, sortBy) {
  if (sortBy === "dueDate") {
    return new Date(a.dueDate) - new Date(b.dueDate);
  }

  return String(a[sortBy]).localeCompare(String(b[sortBy]), undefined, {
    numeric: true,
  });
}

function compareTestRows(a, b, sortBy) {
  if (sortBy === "dueDate") {
    return new Date(a.dueDate) - new Date(b.dueDate);
  }

  return String(a[sortBy]).localeCompare(String(b[sortBy]), undefined, {
    numeric: true,
  });
}

const linkedStateKeyByFamily = {
  risks: "linkedRisks",
  controls: "linkedControls",
  tests: "linkedTests",
  policies: "linkedPolicies",
  populations: "linkedPopulations",
};

const linkedItemTypeByFamily = {
  risks: "Risk",
  controls: "Control",
  tests: "Test",
  policies: "Policy",
  populations: "Population",
};

function singularRelationshipLabel(family) {
  return {
    risks: "Risk",
    controls: "Control",
    tests: "Test",
    policies: "Policy",
    populations: "Population",
  }[family] || "Item";
}

function resolveLinkedItemsWithOverrides(baseLinkedItems, data, workspaceState) {
  return Object.entries(linkedStateKeyByFamily).reduce((resolved, [family, stateKey]) => {
    const hasOverride = Object.prototype.hasOwnProperty.call(workspaceState || {}, stateKey);
    if (!hasOverride) return resolved;

    return {
      ...resolved,
      [family]: resolveWorkspaceItemsByIds(workspaceState[stateKey], data?.[family], linkedItemTypeByFamily[family]),
    };
  }, { ...baseLinkedItems });
}

function resolveWorkspaceItemsByIds(ids, rows = [], type) {
  const rowsById = new Map(
    normalizeRelationshipList(rows).map((row) => [safeDisplayText(row.id || row.name), row])
  );

  return normalizeRelationshipList(ids)
    .map((value) => safeDisplayText(typeof value === "object" && value !== null ? value.id || value.name : value))
    .filter(Boolean)
    .map((id) => rowsById.get(id))
    .filter(Boolean)
    .map((row) => createWorkspaceItem(type, row));
}

function getSavedLinkedOverrides(workspaceState) {
  return Object.values(linkedStateKeyByFamily).reduce((overrides, stateKey) => {
    if (!Object.prototype.hasOwnProperty.call(workspaceState || {}, stateKey)) return overrides;
    return { ...overrides, [stateKey]: workspaceState[stateKey] };
  }, {});
}

function createWorkspaceItem(type, item) {
  const id = item.id || item.name;
  const title = item.title || item.name;
  const priority = item.priority || "";
  const category = item.category || categoryFromType(type);
  const evidence = item.evidence || item.evidenceStatus || "";

  return {
    type,
    id,
    title,
    description: item.description || item.title || "",
    status: item.status || "",
    priority,
    owner: item.owner || "",
    reviewer: item.reviewer || "",
    approver: item.approver || "",
    dueDate: item.dueDate || "",
    category,
    mappedRisks: item.mappedRisks || "",
    mappedTests: item.mappedTests || "",
    mappedControls: item.mappedControls || "",
    linkedRisks: item.linkedRisks || [],
    linkedTests: item.linkedTests || [],
    linkedControls: item.linkedControls || [],
    linkedPolicies: item.linkedPolicies || [],
    linkedPopulations: item.linkedPopulations || [],
    evidence,
    requiredEvidence: item.requiredEvidence || [],
    comments: item.comments ?? "",
    guidance: item.guidance || "",
    updatedAt: item.updatedAt || "",
    activityTimeline: item.activityTimeline || [],
    aiRecommendation: item.aiRecommendation || "",
  };
}

function categoryFromType(type) {
  return {
    Risk: "Risk Management",
    Control: "Control Operations",
    Test: "Testing",
    Policy: "Policy Management",
    Population: "Population Management",
  }[type];
}

function updateWorkspaceHistory(item, replace = false) {
  const url = new URL(window.location.href);

  if (item) {
    url.searchParams.set("itemType", item.type);
    url.searchParams.set("itemId", item.id);
  } else {
    url.searchParams.delete("itemType");
    url.searchParams.delete("itemId");
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const historyMethod = replace ? "replaceState" : "pushState";
  window.history[historyMethod]({}, "", nextUrl);
}

function getWorkspaceItemFromLocation(locationValue, data) {
  const searchParams = new URLSearchParams(locationValue.search);
  const itemType = searchParams.get("itemType");
  const itemId = searchParams.get("itemId");

  if (!itemType || !itemId) return null;

  const rowsByType = {
    Risk: data.risks,
    Control: data.controls,
    Test: data.tests,
    Policy: data.policies,
    Population: data.populations,
  };
  const row = rowsByType[itemType]?.find((item) => item.id === itemId);

  return row ? createWorkspaceItem(itemType, row) : null;
}

function downloadExcelFile(fileName, rows) {
  const headers = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set())
  );
  const table = [
    headers.join("\t"),
    ...rows.map((row) =>
      headers
        .map((header) => String(row[header] ?? "").replace(/\t|\n/g, " "))
        .join("\t")
    ),
  ].join("\n");
  const blob = new Blob([table], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function isCMMCFramework(framework) {
  return framework?.slug === "cmmc";
}

function getSelectedFramework(location) {
  const searchParams = new URLSearchParams(location.search);
  const selectedSlug = searchParams.get("framework");
  const stateFramework = location.state?.framework;

  if (stateFramework && slugifyFramework(stateFramework.name) === selectedSlug) {
    return {
      ...stateFramework,
      slug: selectedSlug,
    };
  }

  const framework = frameworks.find((item) => {
    const slug = item.slug || slugifyFramework(item.name);
    return slug === selectedSlug;
  });

  if (!framework) return null;

  return {
    ...framework,
    slug: selectedSlug,
  };
}

function slugifyFramework(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
