import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User as UserIcon, Copy, Check } from "lucide-react";
import { DatabaseMessage } from "../types";

interface MessageItemProps {
  message: DatabaseMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={`py-5 px-4 md:px-6 flex gap-4 ${
        isAssistant ? "bg-slate-900/40" : "bg-transparent"
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${
          isAssistant
            ? "bg-gradient-to-tr from-brand-600 to-rose-400 text-white shadow-md shadow-brand-600/20"
            : "bg-slate-800 text-slate-300 border border-slate-700"
        }`}
      >
        {isAssistant ? <Bot size={18} /> : <UserIcon size={18} />}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">
            {isAssistant ? "Assistente Ollama" : "Você"}
          </span>
          <span className="text-[10px] text-slate-500">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {message.tokens && (
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded-md">
              {message.tokens} tokens
            </span>
          )}
        </div>

        <div className="text-sm text-slate-200 leading-relaxed break-words prose prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                const codeString = String(children).replace(/\n$/, "");

                if (!inline && match) {
                  return <CodeBlock language={match[1]} code={codeString} />;
                }

                return (
                  <code
                    className="px-1.5 py-0.5 rounded-md bg-slate-800 text-brand-300 font-mono text-xs"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden my-3 border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800/80 text-xs text-slate-400">
        <span className="font-mono lowercase text-[11px] text-slate-300">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copiar código</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-100">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

