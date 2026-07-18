import {
  CMMC_FRAMEWORK_ID,
  getFrameworkLibrary,
} from "../../../core/engines/framework-engine/frameworkRegistry";
import { getCMMCWorkflowState } from "../hooks/useCMMCWorkflowState";
import {
  addField,
  addMultilineField,
  addSection,
  addSpacer,
  addSubtitle,
  addTitle,
  createTextPDF,
  downloadBlob,
  formatDateTime,
  formatWorkflowValue,
  slugify,
} from "./cmmcSSPExportService";
import { formatCMMCActivityName, loadCMMCActivityHistory } from "./cmmcActivityHistoryService";
import { buildCMMCEvidenceAttachmentStats } from "./cmmcDashboardMetricsService";
import {
  buildCMMCPolicyDocumentMetrics,
  buildCMMCPolicyDocumentRows,
} from "./cmmcPolicyWorkflowService";
import { calculateCMMCSPRSMetrics } from "./cmmcSPRSCalculationService";

const cmmcLibrary = getFrameworkLibrary(CMMC_FRAMEWORK_ID) || emptyFrameworkLibrary();

export function exportCMMCExecutiveReportToPDF(options = {}) {
  const reportData = buildCMMCExecutiveReportData(options);
  const pdfBlob = createCMMCExecutiveReportPDFBlob(reportData);
  downloadBlob(pdfBlob, buildExecutiveReportFileName(reportData));
}

export function createCMMCExecutiveReportPDFBlob(options = {}) {
  const reportData = options?.metrics ? options : buildCMMCExecutiveReportData(options);
  return createTextPDF(buildExecutiveReportDocumentLines(reportData));
}

export function buildCMMCExecutiveReportData({
  workflowState = getCMMCWorkflowState(),
  frameworkLibrary = cmmcLibrary,
  sprsMetrics,
  policyRows,
  policyMetrics,
  activityHistory = loadCMMCActivityHistory(),
  assessmentDate,
  currentSprsScore,
} = {}) {
  const normalizedWorkflowState = workflowState || {};
  const controlWorkflowFields = normalizedWorkflowState.controls?.fields || {};
  const evidenceWorkflowFields = normalizedWorkflowState.evidence?.fields || {};
  const organizationProfile = normalizedWorkflowState.organization || {};
  const resolvedSprsMetrics = sprsMetrics || calculateCMMCSPRSMetrics(normalizedWorkflowState, frameworkLibrary);
  const resolvedPolicyRows =
    policyRows ||
    buildCMMCPolicyDocumentRows({
      controlWorkflowFields,
      evidenceWorkflowFields,
      frameworkLibrary,
    });
  const resolvedPolicyMetrics = policyMetrics || buildCMMCPolicyDocumentMetrics(resolvedPolicyRows);
  const dashboardMetrics = buildExecutiveDashboardMetrics({
    sprsMetrics: resolvedSprsMetrics,
    policyMetrics: resolvedPolicyMetrics,
    controlWorkflowFields,
  });
  const activities = Array.isArray(activityHistory) ? activityHistory : [];
  const recentActivity = buildRecentActivitySummary(activities);
  const metrics = {
    ...dashboardMetrics,
    currentSprsScore: formatWorkflowValue(currentSprsScore ?? resolvedSprsMetrics.currentSPRSScore),
    pointsSecured: Number(resolvedSprsMetrics.pointsSecured) || 0,
    pointsAtRisk: Number(resolvedSprsMetrics.pointsAtRisk) || 0,
    criticalGapCount: Number(resolvedSprsMetrics.criticalGapCount) || 0,
    assessmentDate: resolveAssessmentDate(assessmentDate, normalizedWorkflowState),
    recentActivity,
  };

  return {
    organizationProfile,
    metrics: {
      ...metrics,
      overallReadinessSummary: buildOverallReadinessSummary(metrics),
    },
  };
}

function buildExecutiveReportDocumentLines(reportData) {
  const lines = [];
  const organizationProfile = reportData.organizationProfile || {};
  const metrics = reportData.metrics || {};
  const recentActivity = metrics.recentActivity || {};

  addTitle(lines, "Executive Compliance Report");
  addSubtitle(lines, "CMMC Level 2 Executive Summary");
  addField(lines, "Generated", new Date().toLocaleString());
  addSpacer(lines, 14);

  addSection(lines, "Organization Summary");
  addField(lines, "Organization Name", organizationProfile.organizationName);
  addField(lines, "Organization Type", organizationProfile.organizationType);
  addField(lines, "System / Application Name", organizationProfile.systemName);
  addField(lines, "CUI Types", organizationProfile.cuiTypes);
  addField(lines, "Cloud Platforms", organizationProfile.cloudPlatforms);
  addField(lines, "Email Platform", organizationProfile.emailPlatform);
  addField(lines, "Storage Platform", organizationProfile.storagePlatform);
  addField(lines, "Devices", organizationProfile.devices);
  addField(lines, "Assessment Date", metrics.assessmentDate);
  addSpacer(lines, 8);

  addSection(lines, "Executive Metrics");
  addField(lines, "Current SPRS Score", metrics.currentSprsScore);
  addField(lines, "SPRS Points Secured", metrics.pointsSecured);
  addField(lines, "SPRS Points At Risk", metrics.pointsAtRisk);
  addField(lines, "Critical Gaps", metrics.criticalGapCount);
  addField(lines, "Compliance Percentage", formatPercent(metrics.compliancePercentage));
  addField(lines, "Completion Percentage", formatPercent(metrics.completionPercentage));
  addField(lines, "Total Controls", metrics.totalControls);
  addField(lines, "Completed Controls", metrics.completedControls);
  addField(lines, "In Progress Controls", metrics.inProgressControls);
  addField(lines, "Not Started Controls", metrics.notStartedControls);
  addField(lines, "Published Policies", metrics.publishedPolicies);
  addField(lines, "Remaining Policies", metrics.remainingPolicies);
  addField(lines, "Evidence Coverage", formatPercent(metrics.evidenceCoverage));
  addField(lines, "Missing Evidence", metrics.missingEvidence);
  addField(lines, "Open POA&M Items", metrics.openPOAMItems);
  addSpacer(lines, 8);

  addSection(lines, "Recent Activity Summary");
  addField(lines, "Activity Entries", recentActivity.activityCount);
  addField(lines, "Latest Activity", recentActivity.latestActivity);
  addField(lines, "Latest Activity Timestamp", recentActivity.latestActivityTimestamp);
  addMultilineField(lines, "Activity Mix", recentActivity.activityMix);
  addSpacer(lines, 8);

  addSection(lines, "Overall Readiness Summary");
  addMultilineField(lines, "Summary", metrics.overallReadinessSummary);

  return lines;
}

function buildExecutiveDashboardMetrics({ sprsMetrics = {}, policyMetrics = {}, controlWorkflowFields = {} }) {
  const totalControls = Number(sprsMetrics.totalControls) || 0;
  const completedControls = Number(sprsMetrics.completedControls) || 0;
  const inProgressControls = Number(sprsMetrics.inProgressControls) || 0;
  const notStartedControls = Number(sprsMetrics.notStartedControls) || 0;
  const completionPercentage = clampPercent(sprsMetrics.completionPercentage);
  const compliancePercentage = clampPercent(sprsMetrics.compliancePercentage ?? completionPercentage);
  const evidenceStats = buildCMMCEvidenceAttachmentStats(controlWorkflowFields, sprsMetrics.controls);

  return {
    compliancePercentage,
    completionPercentage,
    totalControls,
    completedControls,
    inProgressControls,
    notStartedControls,
    publishedPolicies: Number(policyMetrics.publishedPolicies) || 0,
    remainingPolicies: Number(policyMetrics.remainingPolicies) || 0,
    evidenceCoverage: evidenceStats.coveragePercentage,
    missingEvidence: evidenceStats.missingControls,
    openPOAMItems: inProgressControls + notStartedControls,
  };
}

function buildRecentActivitySummary(activities = []) {
  const latestActivity = activities[0] || {};
  const activityMix = Object.entries(
    activities.reduce((counts, activity) => {
      const activityType = formatWorkflowValue(activity.activityType);
      if (!activityType) return counts;
      counts[activityType] = (counts[activityType] || 0) + 1;
      return counts;
    }, {})
  )
    .map(([activityType, count]) => `${activityType}: ${count}`)
    .join("\n");

  return {
    activityCount: activities.length,
    latestActivity: latestActivity.activityType ? formatCMMCActivityName(latestActivity) : "",
    latestActivityTimestamp: latestActivity.timestamp ? formatDateTime(latestActivity.timestamp) : "",
    activityMix,
  };
}

function buildOverallReadinessSummary(metrics = {}) {
  if (!Number(metrics.totalControls)) return "";

  return [
    `CMMC completion is ${formatPercent(metrics.completionPercentage)} with ${metrics.completedControls} of ${metrics.totalControls} controls completed.`,
    `Compliance is ${formatPercent(metrics.compliancePercentage)} based on the current workflow state.`,
    `${metrics.publishedPolicies} policies are published and ${metrics.remainingPolicies} remain.`,
    `Evidence coverage is ${formatPercent(metrics.evidenceCoverage)} with ${metrics.missingEvidence} controls missing attachment metadata.`,
    `${metrics.openPOAMItems} POA&M items remain open.`,
  ].join(" ");
}

function resolveAssessmentDate(assessmentDate, workflowState = {}) {
  const explicitAssessmentDate = formatWorkflowValue(assessmentDate);
  if (explicitAssessmentDate) return explicitAssessmentDate;

  const answers = workflowState.scope?.answers || {};
  return firstWorkflowValue(
    answers.assessmentDate,
    answers.systemAssessmentDate,
    answers.cmmcAssessmentDate,
    answers.auditAssessmentDate
  );
}

function firstWorkflowValue(...values) {
  for (const value of values) {
    const formattedValue = formatWorkflowValue(value);
    if (formattedValue) return formattedValue;
  }

  return "";
}

function formatPercent(value) {
  const normalizedValue = formatWorkflowValue(value);
  return normalizedValue ? `${clampPercent(normalizedValue)}%` : "";
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function buildExecutiveReportFileName(reportData = {}) {
  const organizationProfile = reportData.organizationProfile || {};
  const metrics = reportData.metrics || {};
  const nameParts = ["CMMC-Executive-Report", organizationProfile.organizationName, organizationProfile.systemName, metrics.assessmentDate]
    .map((part) => slugify(part))
    .filter(Boolean);
  return `${nameParts.join("-") || "CMMC-Executive-Report"}.pdf`;
}

function emptyFrameworkLibrary() {
  return {
    controls: [],
    evidence: [],
    mappings: [],
  };
}
