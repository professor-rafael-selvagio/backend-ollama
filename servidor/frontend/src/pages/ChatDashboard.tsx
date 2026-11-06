import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  Conversation,
  DatabaseMessage,
  OllamaModel,
  Project,
} from "../types";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { ChatArea } from "../components/ChatArea";
import { ChatInput } from "../components/ChatInput";
import { ProjectModal } from "../components/ProjectModal";
import { RenameModal } from "../components/RenameModal";
import { UserProfileModal } from "../components/UserProfileModal";

interface ChatDashboardProps {
  onOpenAdmin?: () => void;
}

export const ChatDashboard: React.FC<ChatDashboardProps> = ({ onOpenAdmin }) => {
  const { user, logout } = useAuth();

  // Estados principais
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("qwen2.5:3b");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DatabaseMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean>(true);

  // Modais e Menu Mobile
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [conversationToRename, setConversationToRename] = useState<Conversation | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Carrega lista inicial de projetos, conversas e modelos disponíveis
  const loadInitialData = useCallback(async () => {
    try {
      const [projList, convList, modelList, status] = await Promise.all([
        api.projects.list().catch(() => []),
        api.conversations.list().catch(() => []),
        api.ollama.getModels().catch(() => []),
        api.ollama.getStatus().catch(() => ({ status: "error", available: false })),
      ]);

      setProjects(projList);
      setConversations(convList);
      setModels(modelList);
      setOllamaAvailable(status.available);

      if (modelList.length > 0 && !modelList.some((m) => m.name === selectedModel)) {
        setSelectedModel(modelList[0].name);
      }
    } catch (err) {
      console.error("Falha ao carregar dados do dashboard:", err);
    }
  }, [selectedModel]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Carrega mensagens quando uma conversa é selecionada
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const fullConv = await api.conversations.getById(activeConversationId);
        setMessages(fullConv.messages || []);
        if (fullConv.model) {
          setSelectedModel(fullConv.model);
        }
      } catch (err) {
        console.error("Erro ao carregar mensagens:", err);
      }
    };

    fetchMessages();
  }, [activeConversationId]);

  // Conversa ativa atual
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeProject = activeConversation?.project_id
    ? projects.find((p) => p.id === activeConversation.project_id)
    : null;

  // Iniciar novo chat (com ou sem projeto pré-selecionado)
  const handleNewChat = (projectId: string | null = null) => {
    setActiveConversationId(null);
    setMessages([]);
    setInputText("");
    if (projectId) {
      // Cria chat imediato no projeto ou prepara para primeira mensagem
      api.conversations
        .create({
          model: selectedModel,
          title: "Novo Chat",
          project_id: projectId,
        })
        .then((newChat) => {
          setConversations((prev) => [newChat, ...prev]);
          setActiveConversationId(newChat.id);
        })
        .catch(console.error);
    }
  };

  // Enviar mensagem
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText("");

    try {
      let convId = activeConversationId;

      // Se ainda não houver conversa ativa, cria uma nova
      if (!convId) {
        const newConv = await api.conversations.create({
          model: selectedModel,
          title: text.slice(0, 30),
        });
        setConversations((prev) => [newConv, ...prev]);
        convId = newConv.id;
        setActiveConversationId(newConv.id);
      }

      // Adiciona mensagem temporária do usuário na tela
      const tempUserMsg: DatabaseMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: convId,
        user_id: user?.id || "",
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      // Chama a API do backend (que consulta o Ollama e salva tudo no banco)
      const result = await api.conversations.sendMessage(convId, text, selectedModel);

      // Atualiza com as mensagens reais salvas no banco
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        result.userMessage,
        result.assistantMessage,
      ]);

      // Atualiza lista de conversas
      const updatedList = await api.conversations.list();
      setConversations(updatedList);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Erro ao enviar mensagem";
      alert(`Falha no envio: ${errMsg}`);
    } finally {
      setIsSending(false);
    }
  };

  // Gerenciamento de Projetos
  const handleOpenProjectModal = (proj?: Project | null) => {
    setProjectToEdit(proj || null);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (
    name: string,
    description?: string,
    color?: string
  ) => {
    if (projectToEdit) {
      const updated = await api.projects.update(projectToEdit.id, {
        name,
        description,
        color,
      });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const created = await api.projects.create(name, description, color);
      setProjects((prev) => [created, ...prev]);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Tem certeza que deseja excluir este projeto? Os chats não serão apagados, apenas desvinculados.")) {
      return;
    }
    await api.projects.delete(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    const updatedList = await api.conversations.list();
    setConversations(updatedList);
  };

  // Gerenciamento de Conversas (Renomear / Mover)
  const handleOpenRenameModal = (conv: Conversation) => {
    setConversationToRename(conv);
    setIsRenameModalOpen(true);
  };

  const handleSaveRename = async (title: string, projectId: string | null) => {
    if (!conversationToRename) return;
    const updated = await api.conversations.update(conversationToRename.id, {
      title,
      project_id: projectId,
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conversa e todo o seu histórico?")) {
      return;
    }
    await api.conversations.delete(conversationId);
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        projects={projects}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewChat={handleNewChat}
        onOpenProjectModal={handleOpenProjectModal}
        onDeleteProject={handleDeleteProject}
        onOpenRenameModal={handleOpenRenameModal}
        onDeleteConversation={handleDeleteConversation}
        user={user}
        onLogout={logout}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenAdmin={onOpenAdmin}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Conteúdo Central */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          models={models}
          chatTitle={activeConversation?.title}
          project={activeProject}
          ollamaAvailable={ollamaAvailable}
          onOpenRenameModal={
            activeConversation
              ? () => handleOpenRenameModal(activeConversation)
              : undefined
          }
        />

        <ChatArea
          messages={messages}
          isLoading={isSending}
          onSelectPromptSuggestion={(prompt) => {
            setInputText(prompt);
            handleSendMessage(prompt);
          }}
          selectedModel={selectedModel}
        />

        <ChatInput
          value={inputText}
          onChange={setInputText}
          onSend={() => handleSendMessage()}
          isLoading={isSending}
        />
      </div>

      {/* Modais */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        projectToEdit={projectToEdit}
      />

      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        conversation={conversationToRename}
        projects={projects}
        onSave={handleSaveRename}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
      />
    </div>
  );
};

