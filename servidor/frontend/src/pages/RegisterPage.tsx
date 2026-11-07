import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Loader2,
  Sparkles,
  GraduationCap,
  Briefcase,
  CreditCard,
  FileText,
  BadgeAlert,
} from "lucide-react";
import { UserType } from "../types";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<UserType>("aluno");
  const [studentDocType, setStudentDocType] = useState<"ra" | "cpf">("ra");
  const [ra, setRa] = useState("");
  const [cpf, setCpf] = useState("");
  const [nif, setNif] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações no cliente
    if (userType === "funcionario" && !nif.trim()) {
      setError("O NIF é obrigatório para funcionários.");
      return;
    }

    if (userType === "aluno") {
      if (studentDocType === "ra" && !ra.trim()) {
        setError("O RA é obrigatório para alunos.");
        return;
      }
      if (studentDocType === "cpf" && !cpf.trim()) {
        setError("O CPF é obrigatório para alunos.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await register({
        email,
        password,
        name,
        user_type: userType,
        ra: userType === "aluno" && studentDocType === "ra" ? ra.trim() : undefined,
        cpf: userType === "aluno" && studentDocType === "cpf" ? cpf.trim() : undefined,
        nif: userType === "funcionario" ? nif.trim() : undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar usuário");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Logo e Cabeçalho */}
        <div className="text-center mb-6">
          <img
            src="/logo-senai.png"
            alt="SENAI"
            className="h-12 w-auto object-contain mx-auto mb-4 drop-shadow-md rounded"
          />
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Criar Nova Conta <Sparkles size={18} className="text-brand-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Plataforma de Inteligência Artificial SENAI
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-start gap-2.5">
            <BadgeAlert size={18} className="shrink-0 mt-0.5 text-red-400" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção do Perfil: Aluno vs Funcionário */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Selecione o seu perfil na instituição
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType("aluno")}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border text-sm font-medium transition-all cursor-pointer ${userType === "aluno"
                    ? "bg-brand-600/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
              >
                <GraduationCap
                  size={18}
                  className={userType === "aluno" ? "text-brand-400" : "text-slate-500"}
                />
                Aluno
              </button>

              <button
                type="button"
                onClick={() => setUserType("funcionario")}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border text-sm font-medium transition-all cursor-pointer ${userType === "funcionario"
                    ? "bg-brand-600/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
              >
                <Briefcase
                  size={18}
                  className={
                    userType === "funcionario" ? "text-brand-400" : "text-slate-500"
                  }
                />
                Funcionário
              </button>
            </div>
          </div>

          {/* Nome Completo */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              NOME COMPLETO
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
                placeholder="Ex: Rafael de Sena Selvagio"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Documentos Condicionais */}
          {userType === "aluno" ? (
            <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                  Documento de Identificação (Obrigatório)
                </span>
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStudentDocType("ra")}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${studentDocType === "ra"
                        ? "bg-brand-600 text-white font-medium"
                        : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    RA
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentDocType("cpf")}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${studentDocType === "cpf"
                        ? "bg-brand-600 text-white font-medium"
                        : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    CPF
                  </button>
                </div>
              </div>

              {studentDocType === "ra" ? (
                <div>
                  <div className="relative">
                    <FileText
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      required
                      value={ra}
                      onChange={(e) => setRa(e.target.value)}
                      placeholder="Informe o seu RA (Ex: 00123456)"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-10 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Registro de Aluno fornecido pela secretaria acadêmica.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <CreditCard
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      required
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="Informe o seu CPF (Ex: 000.000.000-00)"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-10 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Insira o número do CPF válido.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                NIF - NÚMERO DE IDENTIFICAÇÃO DO FUNCIONÁRIO (OBRIGATÓRIO)
              </label>
              <div className="relative">
                <Briefcase
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  required
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  placeholder="Ex: 0012345"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-10 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Obrigatório para colaboradores, instrutores e professores do SENAI.
              </p>
            </div>
          )}

          {/* E-mail */}
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
                placeholder="seu.email@sp.senai.br"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Senha */}
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
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 mt-4 disabled:opacity-50 cursor-pointer"
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

        <div className="mt-6 text-center text-sm text-slate-500">
          Já possui uma conta?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-brand-400 hover:text-brand-300 font-medium transition-colors cursor-pointer"
          >
            Fazer login
          </button>
        </div>

        {/* Rodapé discreto com créditos */}
        <p className="mt-6 pt-4 border-t border-slate-800/60 text-center text-[11px] text-slate-400">
          Desenvolvido pelo{" "}
          <span className="text-slate-300 font-medium">Prof. Esp. Rafael de Sena Selvagio</span>, utilizando IA.
        </p>
      </div>
    </div>
  );
};
