import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#152033] border border-[#2d4a6a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDestructive
                  ? "bg-[#ff4d6d]/15 text-[#ff4d6d] border border-[#ff4d6d]/30"
                  : "bg-[#00c2c7]/15 text-[#00c2c7] border border-[#00c2c7]/30"
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-[#8ba3c1] hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#8ba3c1] mt-1.5 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-[#2d4a6a]/70">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#8ba3c1] hover:text-white hover:bg-[#243b55] transition active:scale-95"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg active:scale-95 flex items-center gap-1.5 ${
                isDestructive
                  ? "bg-gradient-to-r from-[#ff4d6d] to-[#e63956] hover:from-[#ff5e7c] hover:to-[#f04360] text-white shadow-[#ff4d6d]/25"
                  : "bg-gradient-to-r from-[#00c2c7] to-[#009da1] hover:from-[#00d4da] hover:to-[#00adb1] text-[#0f1c2e] shadow-[#00c2c7]/25"
              }`}
            >
              {isDestructive && <Trash2 className="w-3.5 h-3.5" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
