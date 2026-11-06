import React, { useEffect } from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X, Loader2 } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "success" | "info";
  isAlert?: boolean; // Se true, atua como modal informativo/alerta com apenas 1 botão
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = "Cancelar",
  variant = "info",
  isAlert = false,
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <AlertTriangle size={22} className="text-red-400" />,
          iconBg: "bg-red-500/10 border-red-500/20",
          button: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20",
          defaultConfirmText: isAlert ? "Entendido" : "Confirmar",
        };
      case "warning":
        return {
          icon: <AlertCircle size={22} className="text-amber-400" />,
          iconBg: "bg-amber-500/10 border-amber-500/20",
          button: "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20",
          defaultConfirmText: isAlert ? "Entendido" : "Confirmar",
        };
      case "success":
        return {
          icon: <CheckCircle2 size={22} className="text-emerald-400" />,
          iconBg: "bg-emerald-500/10 border-emerald-500/20",
          button: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20",
          defaultConfirmText: isAlert ? "OK" : "Confirmar",
        };
      case "info":
      default:
        return {
          icon: <Info size={22} className="text-brand-400" />,
          iconBg: "bg-brand-500/10 border-brand-500/20",
          button: "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20",
          defaultConfirmText: isAlert ? "Entendido" : "Confirmar",
        };
    }
  };

  const styles = getVariantStyles();
  const finalConfirmText = confirmText || styles.defaultConfirmText;

  const handleAction = async () => {
    if (onConfirm) {
      await onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${styles.iconBg}`}
            >
              {styles.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-snug">{title}</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
          {!isAlert && (
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={handleAction}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer ${styles.button}`}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            <span>{finalConfirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
