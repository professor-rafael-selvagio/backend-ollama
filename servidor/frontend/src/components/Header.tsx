import React from "react";
import { Menu, Cpu, Folder, FolderInput } from "lucide-react";
import { OllamaModel, Project } from "../types";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  models: OllamaModel[];
  chatTitle?: string;
  project?: Project | null;
  ollamaAvailable?: boolean;
  onOpenRenameModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  selectedModel,
  onSelectModel,
  models,
  chatTitle,
  project,
  ollamaAvailable = true,
  onOpenRenameModal,
}) => {
  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3 truncate flex-1">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1.5 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg md:hidden transition-colors"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 truncate">
          {project && (
            <div
              className="px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 shrink-0"
              style={{
                backgroundColor: `${project.color}20`,
                color: project.color,
                border: `1px solid ${project.color}40`,
              }}
            >
              <Folder size={12} />
              <span>{project.name}</span>
            </div>
          )}

          <h1 className="text-sm font-semibold text-white truncate">
            {chatTitle || "Novo Chat"}
          </h1>

          {onOpenRenameModal && (
            <button
              onClick={onOpenRenameModal}
              title="Mover este chat para um projeto ou renomear"
              className="ml-1.5 px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg border border-slate-800/70 transition-colors flex items-center gap-1.5 text-xs cursor-pointer shrink-0"
            >
              <FolderInput size={13} className="text-brand-400" />
              <span className="hidden sm:inline text-[11px]">
                {project ? "Mover Projeto" : "Organizar em Projeto"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Seletor de Modelo e Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              ollamaAvailable ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-slate-400 hidden sm:inline text-[11px]">
            {ollamaAvailable ? "Ollama Online" : "Ollama Indisponível"}
          </span>
        </div>

        <div className="relative">
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white">
            <Cpu size={14} className="text-brand-400" />
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              {models.length === 0 ? (
                <option value={selectedModel}>{selectedModel || "Carregando..."}</option>
              ) : (
                models.map((m) => (
                  <option key={m.name} value={m.name} className="bg-slate-900 text-white">
                    {m.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

