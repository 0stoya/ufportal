"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

// --- Types ---

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
};

type ToastCtx = {
  show: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

// --- Context ---

const ToastContext = createContext<ToastCtx | null>(null);

function uid() {
  return Math.random().toString(36).substring(2, 9);
}

// --- Sub-Component: Individual Toast ---

function ToastItem({ 
  toast, 
  onDismiss 
}: { 
  toast: Toast; 
  onDismiss: (id: string) => void; 
}) {
  // Handle auto-dismiss timer inside the component
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration ?? 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  // UI Configuration based on type
  const config = {
    success: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-white" },
    error: { icon: AlertCircle, color: "text-red-500", bg: "bg-white" },
    info: { icon: Info, color: "text-blue-500", bg: "bg-white" },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`
        pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-200/50
        animate-in slide-in-from-right-1/2 fade-in zoom-in-95 duration-300
        flex items-start gap-4
      `}
    >
      <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            {toast.title}
          </h3>
        )}
        <p className={`text-sm ${toast.title ? "text-slate-500" : "text-slate-700 font-medium"}`}>
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg p-1 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// --- Provider Component ---

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = uid();
      const newToast = { ...t, id };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Container */}
      <div className="fixed z-[200] top-4 right-4 w-full max-w-sm flex flex-col gap-3 pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// --- Hook ---

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider />");
  return ctx;
}