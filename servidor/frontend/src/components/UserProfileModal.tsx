import React, { useState, useEffect } from "react";
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { User } from "../types";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameSuccessMessage, setNameSuccessMessage] = useState<string | null>(null);
  const [nameErrorMessage, setNameErrorMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleResetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage(null);
    setSuccessMessage(null);
    setNameSuccessMessage(null);
    setNameErrorMessage(null);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameErrorMessage(null);
    setNameSuccessMessage(null);

    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameErrorMessage("O nome completo deve conter pelo menos 2 caracteres.");
      return;
    }

    setIsUpdatingName(true);
    try {
      await updateProfile(trimmed);
      setNameSuccessMessage("Nome atualizado com sucesso!");
    } catch (err: unknown) {
      setNameErrorMessage(
        err instanceof Error ? err.message : "Erro ao atualizar nome completo."
      );
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("A confirmação não coincide com a nova senha.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.auth.changePassword(currentPassword, newPassword);
      setSuccessMessage(res.message || "Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao alterar senha. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-400 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-brand-600/20">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {user.name || "Usuário"}
                <span className="px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-semibold tracking-wide uppercase">
                  Ativo
                </span>
              </h2>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo com Informações e Formulário */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Seção 1: Dados do Perfil e Atualização de Nome */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand-400" />
              Informações da Conta
            </h3>

            {nameSuccessMessage && (
              <div className="p-3 bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{nameSuccessMessage}</span>
              </div>
            )}

            {nameErrorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{nameErrorMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Campo Editável de Nome Completo */}
              <form onSubmit={handleUpdateName} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                <label className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                  <UserIcon size={12} /> Nome Completo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameSuccessMessage(null);
                      setNameErrorMessage(null);
                    }}
                    placeholder="Seu nome completo..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingName || !name.trim() || name.trim() === (user.name || "")}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md shadow-brand-600/20 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    {isUpdatingName && <Loader2 size={12} className="animate-spin" />}
                    Salvar Nome
                  </button>
                </div>
              </form>

              {/* Exibição de E-mail (somente leitura) */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                  <Mail size={12} /> E-mail Cadastrado
                </span>
                <p className="text-sm font-medium text-slate-200 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800/80" />

          {/* Seção 2: Alteração de Senha */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound size={14} className="text-brand-400" />
              Segurança e Troca de Senha
            </h3>

            {/* Alertas de Sucesso e Erro */}
            {successMessage && (
              <div className="p-3 bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  SENHA ATUAL
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual..."
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    NOVA SENHA
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    CONFIRMAR NOVA SENHA
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !currentPassword ||
                    !newPassword ||
                    newPassword.length < 6 ||
                    newPassword !== confirmPassword
                  }
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-lg shadow-brand-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

