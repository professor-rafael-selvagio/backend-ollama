import React, { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Activity,
  ArrowLeft,
  RefreshCw,
  Search,
  Cpu,
  Zap,
  MessageSquare,
  Lock,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Trash2,
  RotateCcw,
  History,
  GraduationCap,
  Briefcase,
  FileText,
  FolderKanban,
  Check,
} from "lucide-react";
import { AdminDeletedItem, AdminMetrics, AdminUser, AuditLogEntry } from "../types";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface AdminDashboardProps {
  onBackToChat: () => void;
}

const SUPERADMIN_EMAIL = "rselvagio@sp.senai.br";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToChat }) => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "trash" | "audit">("overview");

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [deletedItems, setDeletedItems] = useState<AdminDeletedItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "admins" | "alunos" | "funcionarios">("all");
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [metricsData, usersData, deletedData, auditData] = await Promise.all([
        api.admin.getMetrics(),
        api.admin.getUsers(),
        api.admin.getDeleted(),
        api.admin.getAuditLogs(150),
      ]);
      setMetrics(metricsData);
      setUsers(usersData);
      setDeletedItems(deletedData);
      setAuditLogs(auditData);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao carregar dados do painel.",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
      const interval = setInterval(() => {
        loadData(true);
      }, 20000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Se o usuário não for admin, bloqueia estritamente a visualização mesmo se tiver o link
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-full max-w-md bg-slate-900/90 border border-red-500/30 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-sm text-slate-400 mb-6">
            Esta área é exclusiva para administradores autorizados do sistema SENAI. Seu usuário não possui permissão para acessar este painel.
          </p>
          <button
            onClick={onBackToChat}
            className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all shadow-lg shadow-brand-600/20 cursor-pointer"
          >
            Retornar à Área de Chat
          </button>
        </div>
      </div>
    );
  }

  const handleToggleAdminRole = async (targetUser: AdminUser) => {
    if (targetUser.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase() && targetUser.is_admin) {
      setNotification({
        type: "error",
        message: `Não é permitido revogar a permissão do Administrador Principal (${SUPERADMIN_EMAIL}).`,
      });
      return;
    }

    const newRole = !targetUser.is_admin;
    const actionText = newRole ? "conceder" : "revogar";
    const confirmPrompt = window.confirm(
      `Deseja realmente ${actionText} a permissão de Administrador para ${targetUser.name || targetUser.email}?`
    );

    if (!confirmPrompt) return;

    setActionUserId(targetUser.id);
    setNotification(null);

    try {
      const updated = await api.admin.updateUserRole(targetUser.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setNotification({
        type: "success",
        message: newRole
          ? `Permissão de Administrador concedida com sucesso para ${targetUser.name || targetUser.email}!`
          : `Permissão de Administrador revogada para ${targetUser.name || targetUser.email}.`,
      });
      loadData(true);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao atualizar permissão.",
      });
    } finally {
      setActionUserId(null);
    }
  };

  const handleRestoreItem = async (item: AdminDeletedItem) => {
    const confirmPrompt = window.confirm(
      `Deseja restaurar ${item.resource_type === "conversation" ? "a conversa" : "o projeto"} "${item.title}"?`
    );
    if (!confirmPrompt) return;

    setRestoringId(item.id);
    setNotification(null);

    try {
      const msg = await api.admin.restoreItem(item.resource_type, item.id);
      setNotification({
        type: "success",
        message: msg || "Item restaurado com sucesso!",
      });
      // Remove da lista de lixeira localmente e atualiza contadores
      setDeletedItems((prev) => prev.filter((i) => i.id !== item.id));
      loadData(true);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Falha ao restaurar item da lixeira.",
      });
    } finally {
      setRestoringId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.ra && u.ra.toLowerCase().includes(query)) ||
        (u.nif && u.nif.toLowerCase().includes(query)) ||
        (u.cpf && u.cpf.toLowerCase().includes(query));

      if (!matchSearch) return false;

      if (statusFilter === "online") return u.is_online;
      if (statusFilter === "admins") return u.is_admin;
      if (statusFilter === "alunos") return (u.user_type || "aluno") === "aluno";
      if (statusFilter === "funcionarios") return u.user_type === "funcionario";
      return true;
    });
  }, [users, searchQuery, statusFilter]);

  const formatNumber = (num: number = 0) => {
    return new Intl.NumberFormat("pt-BR").format(num);
  };

  const formatDateTime = (isoDate?: string) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatLastSeen = (isoDate?: string, isOnline?: boolean) => {
    if (isOnline) return "Online agora";
    if (!isoDate) return "Nunca acessou";
    const date = new Date(isoDate);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Há menos de 1 min";
    if (diffMin < 60) return `Visto há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Visto há ${diffHours}h`;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Topo / Barra de Navegação Superior */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Voltar para a área de chats"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Voltar ao Chat</span>
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <img
              src="/logo-senai.png"
              alt="SENAI"
              className="h-7 w-auto object-contain rounded"
            />
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2 leading-tight">
                Painel Administrativo
                <span className="px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] uppercase font-semibold">
                  SENAI 6.01
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Gestão Institucional, Lixeira Exclusiva e Trilha de Auditoria
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-400 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-brand-600/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
          </div>
        </div>
      </header>

      {/* Navegação por Abas */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 px-4 md:px-8">
        <div className="flex gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Activity size={15} />
            Visão Geral & Métricas
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Users size={15} />
            Usuários ({users.length})
          </button>

          <button
            onClick={() => setActiveTab("trash")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "trash"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Trash2 size={15} />
            Lixeira do Sistema ({deletedItems.length})
            {deletedItems.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "audit"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <History size={15} />
            Trilha de Auditoria ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Notificações de Ação */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-sm ${
              notification.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle size={18} className="shrink-0 text-red-400" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* ABA 1: VISÃO GERAL */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total de Usuários */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Usuários Cadastrados
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Users size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(metrics?.total_users)}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1 text-sky-400">
                    <GraduationCap size={12} /> {metrics?.total_alunos || 0} Alunos
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-purple-400">
                    <Briefcase size={12} /> {metrics?.total_funcionarios || 0} Funcs
                  </span>
                </div>
              </div>

              {/* Usuários Online */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Online Agora
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Activity size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  {formatNumber(metrics?.online_users)}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Usuários ativos nos últimos 3 minutos
                </p>
              </div>

              {/* Tokens Consumidos */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tokens Totais
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                    <Cpu size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(metrics?.total_tokens)}
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                  <span title="Tokens de Entrada (Prompt)">
                    Entrada: {formatNumber(metrics?.total_prompt_tokens)}
                  </span>
                  <span>•</span>
                  <span title="Tokens de Saída (Geração)">
                    Saída: {formatNumber(metrics?.total_completion_tokens)}
                  </span>
                </div>
              </div>

              {/* Lixeira do Sistema */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Itens na Lixeira
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Trash2 size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {formatNumber(deletedItems.length)}
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                  <span>{metrics?.deleted_conversations || 0} Chats</span>
                  <span>•</span>
                  <span>{metrics?.deleted_projects || 0} Projetos</span>
                </div>
              </div>
            </div>

            {/* Informações Institucionais do Sistema */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-400" />
                  Ambiente de Inteligência Artificial Didática SENAI
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Sistema dedicado para aprendizagem com modelos abertos (Llama, DeepSeek, Qwen) executados em servidor local. Exclusões no sistema utilizam exclusão lógica (*soft delete*), garantindo conformidade e trilha de auditoria para fins pedagógicos.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("trash")}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Trash2 size={14} className="text-amber-400" />
                Explorar Lixeira ({deletedItems.length})
              </button>
            </div>
          </div>
        )}

        {/* ABA 2: USUÁRIOS & PERMISSÕES */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, e-mail, RA, NIF ou CPF..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-brand-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Todos ({users.length})
                </button>
                <button
                  onClick={() => setStatusFilter("online")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === "online"
                      ? "bg-brand-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Online ({users.filter((u) => u.is_online).length})
                </button>
                <button
                  onClick={() => setStatusFilter("admins")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === "admins"
                      ? "bg-brand-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Admins ({users.filter((u) => u.is_admin).length})
                </button>
                <button
                  onClick={() => setStatusFilter("alunos")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === "alunos"
                      ? "bg-brand-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Alunos
                </button>
                <button
                  onClick={() => setStatusFilter("funcionarios")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === "funcionarios"
                      ? "bg-brand-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Funcionários
                </button>
              </div>
            </div>

            {/* Tabela de Usuários */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Usuário</th>
                      <th className="py-3 px-4">Perfil</th>
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4">Status / Último Acesso</th>
                      <th className="py-3 px-4">Tokens Entrada / Saída</th>
                      <th className="py-3 px-4 text-center">Permissão Admin</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Nenhum usuário encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSuperAdmin =
                          u.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();

                        return (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            {/* Nome & Email */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-white">{u.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {u.email}
                              </div>
                            </td>

                            {/* Perfil */}
                            <td className="py-3.5 px-4">
                              {u.user_type === "funcionario" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                  <Briefcase size={10} /> Funcionário
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 border border-sky-500/20 text-sky-400">
                                  <GraduationCap size={10} /> Aluno
                                </span>
                              )}
                            </td>

                            {/* RA / NIF / CPF */}
                            <td className="py-3.5 px-4 font-mono text-[11px]">
                              {u.nif && (
                                <span className="text-purple-300" title="NIF">
                                  NIF: {u.nif}
                                </span>
                              )}
                              {u.ra && (
                                <span className="text-sky-300" title="RA">
                                  RA: {u.ra}
                                </span>
                              )}
                              {u.cpf && (
                                <span className="text-slate-400" title="CPF">
                                  CPF: {u.cpf}
                                </span>
                              )}
                              {!u.nif && !u.ra && !u.cpf && (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    u.is_online
                                      ? "bg-emerald-400 ring-2 ring-emerald-500/30"
                                      : "bg-slate-600"
                                  }`}
                                />
                                <span className={u.is_online ? "text-emerald-400 font-medium" : "text-slate-400"}>
                                  {formatLastSeen(u.last_seen_at, u.is_online)}
                                </span>
                              </div>
                            </td>

                            {/* Tokens */}
                            <td className="py-3.5 px-4 font-mono text-[11px]">
                              <span className="text-slate-300" title="Tokens Entrada">
                                {formatNumber(u.total_prompt_tokens)}
                              </span>{" "}
                              /{" "}
                              <span className="text-brand-400" title="Tokens Saída">
                                {formatNumber(u.total_completion_tokens)}
                              </span>
                            </td>

                            {/* Admin Badge */}
                            <td className="py-3.5 px-4 text-center">
                              {u.is_admin ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-500/10 border border-brand-500/20 text-brand-400">
                                  <ShieldCheck size={12} />
                                  Admin
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Usuário</span>
                              )}
                            </td>

                            {/* Ação */}
                            <td className="py-3.5 px-4 text-right">
                              {isSuperAdmin ? (
                                <span className="text-[10px] text-brand-400/80 font-medium">
                                  Superadmin
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleToggleAdminRole(u)}
                                  disabled={actionUserId === u.id}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                    u.is_admin
                                      ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                  }`}
                                >
                                  {actionUserId === u.id ? (
                                    <RefreshCw size={12} className="animate-spin inline mr-1" />
                                  ) : null}
                                  {u.is_admin ? "Revogar Admin" : "Tornar Admin"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: LIXEIRA DO SISTEMA (EXCLUSIVA ADMIN) */}
        {activeTab === "trash" && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trash2 size={16} className="text-amber-400" />
                  Lixeira do Sistema (Exclusiva para Administradores)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Itens marcados com exclusão lógica (*soft delete*). Podem ser restaurados instantaneamente sem perda de mensagens.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {deletedItems.length} itens encontrados
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Título / Nome</th>
                      <th className="py-3 px-4">Proprietário</th>
                      <th className="py-3 px-4">Data da Exclusão</th>
                      <th className="py-3 px-4 text-right">Restauração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {deletedItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500/40" />
                          A lixeira está vazia. Nenhum chat ou projeto excluído no momento.
                        </td>
                      </tr>
                    ) : (
                      deletedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            {item.resource_type === "conversation" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                <MessageSquare size={11} /> Conversa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <FolderKanban size={11} /> Projeto
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-white">
                            {item.title}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-300">{item.user_name || item.user_email}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {item.user_email}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {formatDateTime(item.deleted_at)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleRestoreItem(item)}
                              disabled={restoringId === item.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <RotateCcw
                                size={12}
                                className={restoringId === item.id ? "animate-spin" : ""}
                              />
                              Restaurar Item
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: TRILHA DE AUDITORIA */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History size={16} className="text-brand-400" />
                  Trilha de Auditoria do Sistema (*Audit Logs*)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Histórico completo de autenticações, cadastros, exclusões e concessões de privilégios.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {auditLogs.length} registros recentes
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Ação</th>
                      <th className="py-3 px-4">Usuário</th>
                      <th className="py-3 px-4">Recurso / ID</th>
                      <th className="py-3 px-4">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          Nenhum registro de auditoria capturado até o momento.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => {
                        let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
                        if (log.action.includes("REGISTER") || log.action.includes("GRANT")) {
                          badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        } else if (log.action.includes("DELETE") || log.action.includes("REVOKE")) {
                          badgeColor = "bg-red-500/10 text-red-400 border-red-500/20";
                        } else if (log.action.includes("RESTORE")) {
                          badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        } else if (log.action.includes("LOGIN")) {
                          badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                        }

                        return (
                          <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                              {formatDateTime(log.created_at)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${badgeColor}`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              {log.user_email || log.user_id || "Sistema"}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-slate-300 capitalize">{log.resource_type}</span>
                              {log.resource_id && (
                                <span className="block text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                                  {log.resource_id}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                              {log.details ? JSON.stringify(log.details) : "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
