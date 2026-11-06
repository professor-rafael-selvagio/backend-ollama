import React, { useRef, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  isLoading,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-ajuste de altura da caixa de texto
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
      <div className="max-w-4xl mx-auto relative bg-slate-900 border border-slate-800 rounded-2xl shadow-xl focus-within:border-slate-700 transition-all p-2 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isLoading
              ? "Aguarde a resposta do modelo..."
              : "Digite sua mensagem... (Pressione Enter para enviar, Shift+Enter para quebrar linha)"
          }
          disabled={isLoading || disabled}
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none px-2 py-1 max-h-44 disabled:opacity-50"
        />

        <button
          onClick={onSend}
          disabled={!value.trim() || isLoading || disabled}
          className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all shadow-md shadow-brand-600/20 disabled:shadow-none shrink-0 cursor-pointer disabled:cursor-not-allowed"
          title="Enviar mensagem"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-brand-400" />
          ) : (
            <ArrowUp size={18} />
          )}
        </button>
      </div>
      <p className="text-[11px] text-center text-slate-500 mt-2">
        Modelos de IA locais executando de forma privada no seu servidor Linux.
      </p>
    </div>
  );
};

