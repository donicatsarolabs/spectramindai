import { CMMC_FRAMEWORK_ID, resolveFrameworkId } from "../core/engines/framework-engine/frameworkRegistry";

export const isCMMCOnlyMode = String(import.meta.env.VITE_CMMC_ONLY_MODE || "").toLowerCase() === "true";
export const cmmcOnlyModeReason = "Inapplicable for this CMMC-only client demo";

export function isFrameworkApplicable(frameworkIdOrSlug) {
  return !isCMMCOnlyMode || resolveFrameworkId(frameworkIdOrSlug) === CMMC_FRAMEWORK_ID;
}
