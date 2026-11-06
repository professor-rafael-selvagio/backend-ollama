import React, { useState } from "react";
import { X, FolderPlus, Loader2 } from "lucide-react";
import { Project } from "../types";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string, color?: string) => Promise<void>;
  projectToEdit?: Project | null;
}

const PRESET_COLORS = [
  "#3B82F6", // Azul
  "#10B981", // Verde
  "#8B5CF6", // Roxo
  "#F59E0B", // Laranja
  "#EF4444", // Vermelho
  "#EC4899", // Rosa
  "#06B6D4", // Ciano
  "#64748B", // Grafite
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projectToEdit,
}) => {
  const [name, setName] = useState(projectToEdit?.name || "");
  const [description, setDescription] = useState(projectToEdit?.description || "");
  const [color, setColor] = useState(projectToEdit?.color || "#3B82F6");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(name.trim(), description.trim() || undefined, color);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar projeto");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5 text-white font-semibold text-lg">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              <FolderPlus size={18} />
            </div>
            <span>{projectToEdit ? "Editar Projeto" : "Novo Projeto"}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              NOME DO PROJETO
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Algoritmos em Python, Banco de Dados..."
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              DESCRIÇÃO (OPCIONAL)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos e anotações deste projeto..."
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              COR DO PROJETO
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    color === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-lg shadow-brand-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {projectToEdit ? "Salvar Alterações" : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

