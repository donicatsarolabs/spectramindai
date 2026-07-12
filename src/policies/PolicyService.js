import { readScopedJson, writeScopedJson } from "../auth/session";

export const POLICY_LIBRARY_KEY = "spectramind:policy-library";
export const POLICY_ASSIGNMENTS_KEY = "spectramind:policy-assignments";
export const POLICY_ACKNOWLEDGEMENTS_KEY = "spectramind:policy-acknowledgements";
export const POLICY_STATUS_KEY = "spectramind:employee-policy-status";

export const POLICY_MANAGER_ROLES = new Set(["Admin", "Compliance Manager", "Security Manager", "HR"]);

export function canManagePolicies(user) {
  return POLICY_MANAGER_ROLES.has(user?.role || "");
}

export function loadPolicyLibrary(frameworkId, frameworkPolicies = [], activeFramework = null) {
  const saved = readScopedJson(storageKey(POLICY_LIBRARY_KEY, frameworkId), []);
  const savedById = new Map(saved.map((policy) => [policy.id, policy]));
  const frameworkName = activeFramework?.shortName || activeFramework?.name || frameworkId || "Framework";
  const base = (frameworkPolicies || []).map((policy) => {
    const savedPolicy = savedById.get(policy.id);
    return {
      id: policy.id,
      name: savedPolicy?.name || policy.title || policy.name,
      description: savedPolicy?.description || policy.description || policy.aiSummary || "",
      relatedFrameworks: savedPolicy?.relatedFrameworks || [frameworkName],
      version: savedPolicy?.version || "1.0",
      owner: savedPolicy?.owner || "Unassigned",
      effectiveDate: savedPolicy?.effectiveDate || "",
      reviewDate: savedPolicy?.reviewDate || "",
      customFieldValues: savedPolicy?.customFieldValues || {},
      document: savedPolicy?.document || null,
      status: savedPolicy?.status || normalizePolicyStatus(policy.status),
      requireReacknowledgement: savedPolicy?.requireReacknowledgement ?? true,
      versionHistory: savedPolicy?.versionHistory || [],
      custom: false,
      sourcePolicy: policy,
    };
  });
  const custom = saved.filter((policy) => policy.custom);
  return [...base, ...custom];
}

export function savePolicyLibrary(frameworkId, library) {
  writeScopedJson(storageKey(POLICY_LIBRARY_KEY, frameworkId), library.map(stripSourcePolicy), {
    eventName: "spectramind:policy-updated",
  });
  window.dispatchEvent(new Event("storage"));
}

export function createCustomPolicy(frameworkId, library, input, activeFramework) {
  const frameworkName = activeFramework?.shortName || activeFramework?.name || frameworkId || "Framework";
  return [
    ...library,
    {
      id: `custom-policy-${Date.now()}`,
      name: input.name,
      description: input.description || "Custom policy.",
      relatedFrameworks: input.relatedFrameworks?.length ? input.relatedFrameworks : [frameworkName],
      version: input.version || "1.0",
      owner: input.owner || "Unassigned",
      effectiveDate: input.effectiveDate || "",
      reviewDate: input.reviewDate || "",
      customFieldValues: input.customFieldValues || {},
      document: input.document || null,
      status: "Draft",
      requireReacknowledgement: true,
      versionHistory: [],
      custom: true,
    },
  ];
}

export function updatePolicy(library, policyId, updates) {
  return library.map((policy) => {
    if (policy.id !== policyId) return policy;
    const shouldVersion =
      updates.name !== undefined ||
      updates.description !== undefined ||
      updates.version !== undefined ||
      updates.effectiveDate !== undefined ||
      updates.reviewDate !== undefined;
    return {
      ...policy,
      ...updates,
      versionHistory: shouldVersion
        ? [
            {
              id: `policy-version-${Date.now()}`,
              version: policy.version,
              name: policy.name,
              description: policy.description,
              effectiveDate: policy.effectiveDate,
              reviewDate: policy.reviewDate,
              status: policy.status,
              archivedAt: new Date().toISOString(),
            },
            ...(policy.versionHistory || []),
          ]
        : policy.versionHistory || [],
    };
  });
}

export function publishPolicy(library, policyId) {
  return updatePolicy(library, policyId, { status: "Active" });
}

export function archivePolicy(library, policyId) {
  return updatePolicy(library, policyId, { status: "Archived" });
}

export function loadPolicyAssignments(frameworkId, employees = [], library = []) {
  const saved = readScopedJson(storageKey(POLICY_ASSIGNMENTS_KEY, frameworkId), {});
  const employeeIds = employees.map((employee) => employee.id);
  return Object.fromEntries(library.map((policy) => [policy.id, saved[policy.id]?.length ? saved[policy.id] : employeeIds]));
}

export function savePolicyAssignments(frameworkId, assignments) {
  writeScopedJson(storageKey(POLICY_ASSIGNMENTS_KEY, frameworkId), assignments, { eventName: "spectramind:policy-updated" });
  window.dispatchEvent(new Event("storage"));
}

export function loadPolicyAcknowledgements(frameworkId) {
  return normalizeAcknowledgements(readScopedJson(storageKey(POLICY_ACKNOWLEDGEMENTS_KEY, frameworkId), {}));
}

export function savePolicyAcknowledgements(frameworkId, acknowledgements, employees = [], library = [], assignments = {}) {
  writeScopedJson(storageKey(POLICY_ACKNOWLEDGEMENTS_KEY, frameworkId), acknowledgements, {
    eventName: "spectramind:policy-updated",
  });
  writeScopedJson(POLICY_ACKNOWLEDGEMENTS_KEY, acknowledgements, { eventName: "spectramind:policy-updated" });
  writeScopedJson(POLICY_STATUS_KEY, buildEmployeePolicyStatus(employees, library, assignments, acknowledgements), {
    eventName: "spectramind:policy-updated",
  });
  window.dispatchEvent(new Event("spectramind:workspace-updated"));
  window.dispatchEvent(new Event("storage"));
}

export function resetPolicyAcknowledgements(acknowledgements, policyId) {
  return { ...acknowledgements, [policyId]: {} };
}

export function getPolicyMetrics(policy, employees, assignments, acknowledgements) {
  const assigned = assignments[policy.id] || [];
  const acknowledged = assigned.filter((employeeId) => Boolean(acknowledgements[policy.id]?.[employeeId]));
  const pending = assigned.length - acknowledged.length;
  const percentage = assigned.length ? Math.round((acknowledged.length / assigned.length) * 100) : 0;
  return {
    assigned: assigned.length,
    acknowledged: acknowledged.length,
    pending,
    percentage,
    assignedEmployees: employees.filter((employee) => assigned.includes(employee.id)),
  };
}

export function getEmployeePolicyCompliance(employee, library, assignments, acknowledgements) {
  const activePolicies = library.filter((policy) => policy.status === "Active" && (assignments[policy.id] || []).includes(employee.id));
  const acknowledged = activePolicies.filter((policy) => Boolean(acknowledgements[policy.id]?.[employee.id]));
  const percentage = activePolicies.length ? Math.round((acknowledged.length / activePolicies.length) * 100) : 100;
  return {
    assigned: activePolicies.length,
    acknowledged: acknowledged.length,
    pending: Math.max(activePolicies.length - acknowledged.length, 0),
    percentage,
    isCompliant: activePolicies.length === acknowledged.length,
  };
}

export function buildEmployeePolicyStatus(employees, library, assignments, acknowledgements) {
  return Object.fromEntries(
    employees.map((employee) => [employee.id, getEmployeePolicyCompliance(employee, library, assignments, acknowledgements)])
  );
}

export function loadPolicySnapshot(frameworkId = "") {
  const employees = readScopedJson("spectramind:employees", []);
  const library = readScopedJson(storageKey(POLICY_LIBRARY_KEY, frameworkId), readScopedJson(POLICY_LIBRARY_KEY, []));
  const assignments = loadPolicyAssignments(frameworkId, employees, library);
  const acknowledgements = loadPolicyAcknowledgements(frameworkId);
  const employeeStatus = buildEmployeePolicyStatus(employees, library, assignments, acknowledgements);
  const totalAssigned = library.reduce((sum, policy) => sum + (assignments[policy.id]?.length || 0), 0);
  const totalAcknowledged = library.reduce(
    (sum, policy) => sum + (assignments[policy.id] || []).filter((employeeId) => Boolean(acknowledgements[policy.id]?.[employeeId])).length,
    0
  );
  return {
    library,
    assignments,
    acknowledgements,
    employeeStatus,
    totalAssigned,
    totalAcknowledged,
    acknowledgementPercentage: totalAssigned ? Math.round((totalAcknowledged / totalAssigned) * 100) : 0,
  };
}

export function normalizeAcknowledgements(raw = {}) {
  return Object.fromEntries(
    Object.entries(raw || {}).map(([policyId, values]) => [
      policyId,
      Object.fromEntries(
        Object.entries(values || {})
          .filter(([, value]) => value === "Completed" || value === true || value?.acknowledgedAt)
          .map(([employeeId, value]) => [
            employeeId,
            typeof value === "object" ? value : { acknowledgedAt: new Date().toISOString() },
          ])
      ),
    ])
  );
}

function storageKey(baseKey, frameworkId) {
  return frameworkId ? `${baseKey}:${frameworkId}` : baseKey;
}

function stripSourcePolicy(policy) {
  const { sourcePolicy, ...serializable } = policy;
  return serializable;
}

function normalizePolicyStatus(status) {
  if (["Active", "Draft", "Archived"].includes(status)) return status;
  if (["Approved", "Completed", "complete", "implemented"].includes(status)) return "Active";
  return "Draft";
}
