import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LawyerProtectedRoute } from "@/components/LawyerProtectedRoute";
import { UserProtectedRoute } from "@/components/UserProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Home from "./pages/Home";
import ChatPage from "./pages/Chat";
import LawyerChat from "./pages/LawyerChat";
import LawyerSignup from "./pages/LawyerSignup";
import LawyerLogin from "./pages/LawyerLogin";
import LawyerDashboard from "./pages/LawyerDashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound.tsx";
import FindLawyer from "./pages/FindLawyer";

const queryClient = new QueryClient();

function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );
}

/** Login / signup surfaces: send lawyers to their dashboard, everyone else to AI chat. */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageSpinner />;
  }

  if (user) {
    const dest = user.role === "lawyer" ? "/lawyer-dashboard" : "/chat";
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/find-lawyer" element={<FindLawyer />} />
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/lawyer-login"
                  element={
                    <PublicRoute>
                      <LawyerLogin />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <PublicRoute>
                      <Signup />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/lawyer-signup"
                  element={
                    <PublicRoute>
                      <LawyerSignup />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <UserProtectedRoute>
                      <ChatPage />
                    </UserProtectedRoute>
                  }
                />
                <Route
                  path="/lawyer-chat"
                  element={
                    <UserProtectedRoute>
                      <LawyerChat />
                    </UserProtectedRoute>
                  }
                />
                <Route
                  path="/lawyer-dashboard"
                  element={
                    <LawyerProtectedRoute>
                      <LawyerDashboard />
                    </LawyerProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <UserProtectedRoute>
                      <Dashboard />
                    </UserProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
