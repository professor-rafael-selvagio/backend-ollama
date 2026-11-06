import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Bot, Lock, Mail, User as UserIcon, ArrowRight, Loader2, Sparkles } from "lucide-react";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(email, password, name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar usuário");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Logo e Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl mb-4 text-brand-500">
            <Bot size={36} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Criar Nova Conta <Sparkles size={18} className="text-amber-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cadastre-se para acessar diferentes modelos de IA
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              SEU NOME COMPLETO
            </label>
            <div className="relative">
              <UserIcon
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Professor Rafael Selvagio"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              E-MAIL
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@escola.com"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              SENHA (MÍNIMO 6 CARACTERES)
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Finalizar Cadastro
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Já possui uma conta?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-brand-400 hover:text-brand-300 font-medium transition-colors cursor-pointer"
          >
            Fazer login
          </button>
        </div>
      </div>
    </div>
  );
};

