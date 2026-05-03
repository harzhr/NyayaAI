import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );
}

export function LawyerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <Navigate to="/lawyer-login" replace />;
  }

  if (user.role !== "lawyer") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
