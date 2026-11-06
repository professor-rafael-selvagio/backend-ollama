import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ChatDashboard } from "./pages/ChatDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { Loader2 } from "lucide-react";

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [currentView, setCurrentView] = useState<"chat" | "admin">("chat");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <img
          src="/logo-senai.png"
          alt="SENAI"
          className="h-10 w-auto object-contain mb-4 animate-pulse rounded drop-shadow-md"
        />
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin text-brand-400" />
          <span>Carregando plataforma...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === "login" ? (
      <LoginPage onSwitchToRegister={() => setAuthView("register")} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView("login")} />
    );
  }

  if (currentView === "admin" && isAdmin) {
    return <AdminDashboard onBackToChat={() => setCurrentView("chat")} />;
  }

  return <ChatDashboard onOpenAdmin={() => setCurrentView("admin")} />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

