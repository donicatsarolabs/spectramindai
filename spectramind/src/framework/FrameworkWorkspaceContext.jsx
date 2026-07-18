import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getOrganizationScopedStorageKey } from "../auth/session";
import { getFrameworkLibrary, resolveFrameworkId } from "../core/engines/framework-engine/frameworkRegistry";
import { apiRequest, getApiSession, isApiEnabled } from "../api/client";

const STORAGE_KEY = "spectramind:framework-workspace";
const CART_STORAGE_KEY = "spectramind:framework-cart";

export const FRAMEWORK_CATALOG = [
  {
    id: "soc2-type-ii",
    slug: "soc-2",
    name: "SOC 2",
    shortName: "SOC 2",
    description: "SOC 2 controls, tests, risks, policies, and evidence readiness.",
  },
  {
    id: "iso27001-2022",
    slug: "iso-27001",
    name: "ISO 27001",
    shortName: "ISO 27001",
    description: "ISO 27001 ISMS controls, risks, policies, and mandatory documents.",
  },
  {
    id: "hipaa",
    slug: "hipaa",
    name: "HIPAA",
    shortName: "HIPAA",
    description: "Healthcare privacy and security compliance workspace.",
  },
  {
    id: "gdpr",
    slug: "gdpr",
    name: "GDPR",
    shortName: "GDPR",
    description: "Privacy program readiness and data protection operations.",
  },
  {
    id: "pci-dss",
    slug: "pci-dss",
    name: "PCI DSS",
    shortName: "PCI DSS",
    description: "Payment card security controls and evidence tracking.",
  },
  {
    id: "cmmc",
    slug: "cmmc",
    name: "CMMC",
    shortName: "CMMC",
    description: "Defense contractor cybersecurity maturity workspace.",
  },
];

const FrameworkWorkspaceContext = createContext(null);

export function FrameworkWorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(() => loadFrameworkWorkspace());
  const [cartFrameworkIds, setCartFrameworkIds] = useState(() => loadFrameworkCart());
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setWorkspace(loadFrameworkWorkspace());
      setCartFrameworkIds(loadFrameworkCart());
    };

    window.addEventListener("spectramind:framework-workspace-updated", refresh);
    window.addEventListener("spectramind:session-updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("spectramind:framework-workspace-updated", refresh);
      window.removeEventListener("spectramind:session-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const persistWorkspace = useCallback((nextWorkspace) => {
    persistFrameworkWorkspace(nextWorkspace);
    setWorkspace(nextWorkspace);
  }, []);

  useEffect(() => {
    if (!isApiEnabled || !getApiSession()?.token) return undefined;
    let cancelled = false;
    apiRequest("/api/v1/organization-frameworks")
      .then((records) => {
        if (cancelled) return;
        const selectedFrameworkIds = records
          .filter((record) => record.active)
          .map((record) => getFrameworkByIdOrSlug(record.framework?.slug || record.frameworkId)?.id)
          .filter(Boolean);
        const current = loadFrameworkWorkspace();
        persistWorkspace({
          selectedFrameworkIds,
          activeFrameworkId: selectedFrameworkIds.includes(current.activeFrameworkId)
            ? current.activeFrameworkId
            : selectedFrameworkIds[0] || "",
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [persistWorkspace]);

  const selectFramework = useCallback(
    async (frameworkIdOrSlug) => {
      const framework = getFrameworkByIdOrSlug(frameworkIdOrSlug);
      if (!framework) return null;

      if (isApiEnabled && getApiSession()?.token) {
        await apiRequest("/api/v1/organization-frameworks", {
          method: "POST",
          body: JSON.stringify({ frameworkId: resolveFrameworkId(framework.slug) || framework.id }),
        });
      }

      const selectedFrameworkIds = workspace.selectedFrameworkIds.includes(framework.id)
        ? workspace.selectedFrameworkIds
        : [...workspace.selectedFrameworkIds, framework.id];

      const nextWorkspace = {
        selectedFrameworkIds,
        activeFrameworkId: framework.id,
      };

      persistWorkspace(nextWorkspace);
      return framework;
    },
    [persistWorkspace, workspace.selectedFrameworkIds]
  );

  const setActiveFramework = useCallback(
    (frameworkIdOrSlug) => {
      const framework = getFrameworkByIdOrSlug(frameworkIdOrSlug);
      if (!framework || !workspace.selectedFrameworkIds.includes(framework.id)) return null;

      const nextWorkspace = {
        ...workspace,
        activeFrameworkId: framework.id,
      };

      persistWorkspace(nextWorkspace);
      return framework;
    },
    [persistWorkspace, workspace]
  );

  const addToCart = useCallback((frameworkIdOrSlug) => {
    const framework = getFrameworkByIdOrSlug(frameworkIdOrSlug);
    if (!framework || workspace.selectedFrameworkIds.includes(framework.id)) return null;
    const next = cartFrameworkIds.includes(framework.id) ? cartFrameworkIds : [...cartFrameworkIds, framework.id];
    persistFrameworkCart(next);
    setCartFrameworkIds(next);
    setIsCartOpen(true);
    return framework;
  }, [cartFrameworkIds, workspace.selectedFrameworkIds]);

  const removeFromCart = useCallback((frameworkIdOrSlug) => {
    const framework = getFrameworkByIdOrSlug(frameworkIdOrSlug);
    if (!framework) return;
    const next = cartFrameworkIds.filter(id => id !== framework.id);
    persistFrameworkCart(next);
    setCartFrameworkIds(next);
  }, [cartFrameworkIds]);

  const clearCart = useCallback(() => {
    persistFrameworkCart([]);
    setCartFrameworkIds([]);
  }, []);

  const checkoutCart = useCallback(async () => {
    const validIds = cartFrameworkIds.filter(id => !workspace.selectedFrameworkIds.includes(id));
    if (!validIds.length) return [];
    if (isApiEnabled && getApiSession()?.token) {
      await apiRequest("/api/v1/organization-frameworks/checkout", {
        method: "POST",
        body: JSON.stringify({ frameworkIds: validIds.map(id => {
          const framework = getFrameworkByIdOrSlug(id);
          return resolveFrameworkId(framework?.slug) || framework?.id;
        }) }),
      });
    }
    const selectedFrameworkIds = [...workspace.selectedFrameworkIds, ...validIds];
    persistWorkspace({ selectedFrameworkIds, activeFrameworkId: workspace.activeFrameworkId || validIds[0] });
    persistFrameworkCart([]);
    setCartFrameworkIds([]);
    setIsCartOpen(false);
    return validIds.map(getFrameworkByIdOrSlug).filter(Boolean);
  }, [cartFrameworkIds, persistWorkspace, workspace]);

  const selectedFrameworks = useMemo(
    () => workspace.selectedFrameworkIds.map(getFrameworkByIdOrSlug).filter(Boolean),
    [workspace.selectedFrameworkIds]
  );

  const availableFrameworks = useMemo(
    () => FRAMEWORK_CATALOG.filter((framework) => !workspace.selectedFrameworkIds.includes(framework.id)),
    [workspace.selectedFrameworkIds]
  );

  const activeFramework = useMemo(
    () => getFrameworkByIdOrSlug(workspace.activeFrameworkId),
    [workspace.activeFrameworkId]
  );
  const cartFrameworks = useMemo(
    () => cartFrameworkIds.map(getFrameworkByIdOrSlug).filter(Boolean),
    [cartFrameworkIds]
  );

  const value = useMemo(
    () => ({
      frameworks: FRAMEWORK_CATALOG,
      selectedFrameworkIds: workspace.selectedFrameworkIds,
      selectedFrameworks,
      availableFrameworks,
      activeFrameworkId: activeFramework?.id || "",
      activeFramework,
      cartFrameworks,
      cartCount: cartFrameworks.length,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      clearCart,
      checkoutCart,
      selectFramework,
      setActiveFramework,
      isFrameworkSelected: (frameworkIdOrSlug) => {
        const framework = getFrameworkByIdOrSlug(frameworkIdOrSlug);
        return Boolean(framework && workspace.selectedFrameworkIds.includes(framework.id));
      },
    }),
    [activeFramework, addToCart, availableFrameworks, cartFrameworks, checkoutCart, clearCart, isCartOpen, removeFromCart, selectFramework, selectedFrameworks, setActiveFramework, workspace.selectedFrameworkIds]
  );

  return (
    <FrameworkWorkspaceContext.Provider value={value}>
      {children}
    </FrameworkWorkspaceContext.Provider>
  );
}

export function useFrameworkWorkspace() {
  const context = useContext(FrameworkWorkspaceContext);
  if (!context) {
    throw new Error("useFrameworkWorkspace must be used within FrameworkWorkspaceProvider");
  }

  return context;
}

export function getFrameworkByIdOrSlug(value) {
  if (!value) return null;
  const resolvedId = resolveFrameworkId(value);
  return FRAMEWORK_CATALOG.find(
    (framework) => framework.id === value || framework.slug === value || framework.id === resolvedId
  ) || null;
}

export function frameworkHasLibrary(frameworkIdOrSlug) {
  const framework = getFrameworkByIdOrSlug(frameworkIdOrSlug);
  return Boolean(framework && getFrameworkLibrary(framework.id));
}

function loadFrameworkWorkspace() {
  if (typeof window === "undefined") {
    return emptyWorkspace();
  }

  try {
    const raw = window.localStorage.getItem(getOrganizationScopedStorageKey(STORAGE_KEY));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return emptyWorkspace();

    const selectedFrameworkIds = Array.isArray(parsed.selectedFrameworkIds)
      ? parsed.selectedFrameworkIds.filter((id) => getFrameworkByIdOrSlug(id))
      : [];

    const activeFramework = getFrameworkByIdOrSlug(parsed.activeFrameworkId);
    const activeFrameworkId = activeFramework && selectedFrameworkIds.includes(activeFramework.id)
      ? activeFramework.id
      : "";

    return { selectedFrameworkIds, activeFrameworkId };
  } catch {
    return emptyWorkspace();
  }
}

function persistFrameworkWorkspace(workspace) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(getOrganizationScopedStorageKey(STORAGE_KEY), JSON.stringify(workspace));
  window.dispatchEvent(new Event("spectramind:framework-workspace-updated"));
  window.dispatchEvent(new Event("spectramind:active-framework-updated"));
  window.dispatchEvent(new Event("spectramind:workspace-updated"));
  window.dispatchEvent(new Event("spectramind:questionnaire-updated"));
}

function loadFrameworkCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getOrganizationScopedStorageKey(CART_STORAGE_KEY));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? [...new Set(parsed.filter(id => getFrameworkByIdOrSlug(id)))] : [];
  } catch { return []; }
}

function persistFrameworkCart(ids) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getOrganizationScopedStorageKey(CART_STORAGE_KEY), JSON.stringify(ids));
  window.dispatchEvent(new Event("spectramind:framework-workspace-updated"));
}

function emptyWorkspace() {
  return {
    selectedFrameworkIds: [],
    activeFrameworkId: "",
  };
}
