import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ChatDashboard } from "./pages/ChatDashboard";
import { Bot, Loader2 } from "lucide-react";

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<"login" | "register">("login");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl mb-4 text-brand-500 animate-pulse">
          <Bot size={40} />
        </div>
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

  return <ChatDashboard />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

