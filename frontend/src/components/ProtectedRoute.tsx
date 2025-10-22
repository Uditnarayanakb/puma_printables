import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";

type ProtectedRouteProps = {
  isAuthenticated: boolean;
  children: ReactElement;
};

export function ProtectedRoute({
  isAuthenticated,
  children,
}: ProtectedRouteProps) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
