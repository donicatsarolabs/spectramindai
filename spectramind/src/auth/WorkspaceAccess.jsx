import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "./UserContext";
import { canManageWorkspace } from "./session";

export function OnboardingRequired() {
  const { user } = useUser();
  const location = useLocation();
  if (!user?.onboardingComplete) return <Navigate to={canManageWorkspace(user?.role) ? "/onboarding/organization" : "/join-organization"} replace state={{ from: location }} />;
  return <Outlet />;
}

export function ManagerRequired() {
  const { user } = useUser();
  if (!canManageWorkspace(user?.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
