const API_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const API_SESSION_KEY = "spectramind:api-session";

export const isApiEnabled = Boolean(API_URL);

export function getApiSession() {
  if (!isApiEnabled || typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(API_SESSION_KEY) || "null"); }
  catch { return null; }
}

export function persistApiSession(session) {
  window.localStorage.setItem(API_SESSION_KEY, JSON.stringify(session));
}

export function clearApiSession() {
  window.localStorage.removeItem(API_SESSION_KEY);
}

export async function apiRequest(path, options = {}) {
  if (!isApiEnabled) throw new Error("Backend API is not configured");
  const apiSession = getApiSession();
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("content-type", "application/json");
  if (apiSession?.token) headers.set("authorization", `Bearer ${apiSession.token}`);
  if (apiSession?.organizationId) headers.set("x-organization-id", apiSession.organizationId);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = body?.code;
    error.details = body?.details;
    error.validationFailed = Boolean(body?.validationFailed);
    error.missingEvidence = Array.isArray(body?.missingEvidence) ? body.missingEvidence : [];
    error.requestId = body?.requestId;
    throw error;
  }
  return body;
}

export async function apiRequestRaw(path, options = {}) {
  if (!isApiEnabled) throw new Error("Backend API is not configured");
  const apiSession = getApiSession();
  const headers = new Headers(options.headers || {});
  if (apiSession?.token) headers.set("authorization", `Bearer ${apiSession.token}`);
  if (apiSession?.organizationId) headers.set("x-organization-id", apiSession.organizationId);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Request failed with status ${response.status}`);
  }
  return response;
}

export async function loginWithApi(email, password) {
  const response = await apiRequest("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  const organization = response.organizations[0];
  persistApiSession({ token: response.token, organizationId: organization?.id || null });
  return {
    userId: response.user.id,
    name: response.user.name,
    email: response.user.email,
    organizationId: organization?.id,
    organizationName: organization?.name,
    role: roleLabel(organization?.role || response.user.requestedRole),
    onboardingComplete: Boolean(organization),
    organizationSetupSkipped: false,
    apiAuthenticated: true,
  };
}

export async function registerWithApi(input) {
  const response = await apiRequest("/api/v1/auth/register", { method: "POST", body: JSON.stringify(input) });
  const organization = response.organizations[0];
  persistApiSession({ token: response.token, organizationId: organization?.id || null });
  return {
    userId: response.user.id, name: response.user.name, email: response.user.email,
    organizationId: organization?.id, organizationName: organization?.name,
    role: roleLabel(organization?.role || response.user.requestedRole),
    onboardingComplete: Boolean(organization),
    organizationSetupSkipped: Boolean(input.organizationSetupSkipped && !organization),
    apiAuthenticated: true,
  };
}

function roleLabel(role) {
  return {
    OWNER: "Admin",
    ADMIN: "Admin",
    COMPLIANCE_MANAGER: "Compliance Manager",
    SECURITY_MANAGER: "Security Manager",
    HR_MANAGER: "HR",
    AUDITOR: "Auditor",
    EMPLOYEE: "Employee",
    READ_ONLY: "Read Only",
  }[role] || role;
}
