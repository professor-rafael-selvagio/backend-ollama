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
} from "lucide-react";
import { AdminMetrics, AdminUser } from "../types";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface AdminDashboardProps {
  onBackToChat: () => void;
}

const SUPERADMIN_EMAIL = "rselvagio@sp.senai.br";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToChat }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "admins">("all");
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [metricsData, usersData] = await Promise.all([
        api.admin.getMetrics(),
        api.admin.getUsers(),
      ]);
      setMetrics(metricsData);
      setUsers(usersData);
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
    loadData();
    // Atualização automática dos status e métricas a cada 20 segundos
    const interval = setInterval(() => {
      loadData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

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
      // Recarrega métricas
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

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);

      if (!matchSearch) return false;

      if (statusFilter === "online") return u.is_online;
      if (statusFilter === "admins") return u.is_admin;
      return true;
    });
  }, [users, searchQuery, statusFilter]);

  const formatNumber = (num: number = 0) => {
    return new Intl.NumberFormat("pt-BR").format(num);
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
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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
                Gestão de Usuários, Permissões e Monitoramento de Tokens
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

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Notificações / Feedback */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl flex items-center justify-between text-sm transition-all ${
              notification.type === "success"
                ? "bg-brand-500/10 border border-brand-500/30 text-brand-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === "success" ? (
                <CheckCircle2 size={18} className="shrink-0" />
              ) : (
                <AlertCircle size={18} className="shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100 underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Grade de KPIs e Métricas de Consumo de IA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card: Total de Usuários */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Usuários</span>
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <Users size={16} />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-white">
                {isLoading ? "..." : formatNumber(metrics?.total_users)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Cadastrados no sistema</p>
            </div>
          </div>

          {/* Card: Usuários Online */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Online Agora</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Activity size={16} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-400">
                  {isLoading ? "..." : formatNumber(metrics?.online_users)}
                </span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Ativos nos últimos 3 min</p>
            </div>
          </div>

          {/* Card: Tokens de Entrada (Prompt) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Tokens Entrada</span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <Cpu size={16} />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-amber-400">
                {isLoading ? "..." : formatNumber(metrics?.total_prompt_tokens)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Prompt enviado aos modelos</p>
            </div>
          </div>

          {/* Card: Tokens de Saída (Geração) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Tokens Saída</span>
              <div className="p-2 bg-brand-500/10 text-brand-400 rounded-xl">
                <Zap size={16} />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-brand-400">
                {isLoading ? "..." : formatNumber(metrics?.total_completion_tokens)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Respostas geradas pelo Ollama</p>
            </div>
          </div>

          {/* Card: Total de Conversas / Mensagens */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Atividade Total</span>
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                <MessageSquare size={16} />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-purple-300">
                {isLoading ? "..." : formatNumber(metrics?.total_conversations)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {formatNumber(metrics?.total_messages)} mensagens trocadas
              </p>
            </div>
          </div>
        </div>

        {/* Seção da Tabela de Usuários */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xs">
          {/* Barra de Filtros e Busca */}
          <div className="p-4 md:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar usuário por nome ou e-mail..."
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Todos ({users.length})
              </button>
              <button
                onClick={() => setStatusFilter("online")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "online"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Online ({users.filter((u) => u.is_online).length})
              </button>
              <button
                onClick={() => setStatusFilter("admins")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === "admins"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Admins ({users.filter((u) => u.is_admin).length})
              </button>
            </div>
          </div>

          {/* Tabela Responsiva */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Papel</th>
                  <th className="py-3 px-4">Tokens Entrada</th>
                  <th className="py-3 px-4">Tokens Saída</th>
                  <th className="py-3 px-4">Conversas</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-400" />
                      Carregando usuários do sistema...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Nenhum usuário encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSuperAdmin = u.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
                    const isCurrentUser = u.id === user?.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Usuário */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-400 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm">
                              {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate max-w-[200px]">
                                {u.name || "Sem Nome"}
                                {isCurrentUser && (
                                  <span className="ml-1.5 text-[10px] text-slate-400">(você)</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 truncate max-w-[200px]">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Status Online */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {u.is_online ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                              <Clock size={12} className="text-slate-500" />
                              {formatLastSeen(u.last_seen_at, false)}
                            </span>
                          )}
                        </td>

                        {/* Papel */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <Lock size={11} />
                              Superadmin
                            </span>
                          ) : u.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/30">
                              <ShieldCheck size={12} />
                              Administrador
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                              Usuário
                            </span>
                          )}
                        </td>

                        {/* Tokens Entrada */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-amber-400/90 font-medium">
                            {formatNumber(u.total_prompt_tokens)}
                          </span>
                        </td>

                        {/* Tokens Saída */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-brand-400 font-medium">
                            {formatNumber(u.total_completion_tokens)}
                          </span>
                        </td>

                        {/* Conversas e Mensagens */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-xs text-slate-300">
                            {u.total_conversations} chats ({u.total_messages} msgs)
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isSuperAdmin ? (
                            <span className="text-xs text-slate-400 italic">
                              Principal
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleAdminRole(u)}
                              disabled={actionUserId === u.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
                                u.is_admin
                                  ? "bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30"
                                  : "bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-600/20"
                              }`}
                              title={
                                u.is_admin
                                  ? "Revogar permissão de administrador deste usuário"
                                  : "Tornar este usuário um administrador do sistema"
                              }
                            >
                              {actionUserId === u.id ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : u.is_admin ? (
                                <>
                                  <UserX size={13} />
                                  <span>Revogar Admin</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck size={13} />
                                  <span>Tornar Admin</span>
                                </>
                              )}
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

        {/* Rodapé institucional com créditos */}
        <footer className="text-center py-4 border-t border-slate-800/50">
          <p className="text-xs text-slate-400">
            Sistema desenvolvido pelo{" "}
            <span className="text-slate-300 font-medium">Prof. Esp. Rafael Selvagio</span>, utilizando IA.
          </p>
        </footer>
      </main>
    </div>
  );
};
