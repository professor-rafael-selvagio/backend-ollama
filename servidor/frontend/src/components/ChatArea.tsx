import React, { useEffect, useRef } from "react";
import { Bot, Sparkles, Code2, Database, Terminal, Lightbulb } from "lucide-react";
import { DatabaseMessage } from "../types";
import { MessageItem } from "./MessageItem";

interface ChatAreaProps {
  messages: DatabaseMessage[];
  isLoading: boolean;
  onSelectPromptSuggestion: (text: string) => void;
  selectedModel: string;
}

const SUGGESTIONS = [
  {
    icon: Code2,
    title: "Estruturas de Dados em Python",
    prompt: "Explique a diferença entre listas, tuplas e dicionários em Python com exemplos práticos.",
  },
  {
    icon: Database,
    title: "Modelagem Relacional SQL",
    prompt: "Como funciona a normalização de banco de dados (1FN, 2FN e 3FN)? Explique de forma simples.",
  },
  {
    icon: Terminal,
    title: "Comandos Docker",
    prompt: "Quais os principais comandos do Docker e Docker Compose utilizados no dia a dia?",
  },
  {
    icon: Lightbulb,
    title: "Boas Práticas de Engenharia",
    prompt: "O que são os princípios SOLID no desenvolvimento de software?",
  },
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  onSelectPromptSuggestion,
  selectedModel,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-xl space-y-6">
          <div className="inline-flex flex-col items-center">
            <img
              src="/logo-senai.png"
              alt="SENAI"
              className="h-12 w-auto object-contain rounded drop-shadow-lg mb-2"
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
              Como posso te ajudar hoje?
              <Sparkles size={20} className="text-amber-400" />
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Conectado ao modelo local{" "}
              <span className="font-semibold text-brand-400 px-1.5 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/20">
                {selectedModel || "Ollama"}
              </span>
              . Suas mensagens são salvas de forma privada.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
            {SUGGESTIONS.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectPromptSuggestion(s.prompt)}
                  className="p-3.5 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-brand-400 font-medium text-xs mb-1">
                    <Icon size={14} />
                    <span>{s.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 group-hover:text-slate-300 line-clamp-2">
                    {s.prompt}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="py-5 px-4 md:px-6 flex gap-4 bg-slate-900/40 animate-pulse">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-400 flex items-center justify-center shrink-0 text-white shadow-md shadow-brand-600/30">
            <Bot size={18} />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
            <span>Processando resposta com {selectedModel}...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
};

