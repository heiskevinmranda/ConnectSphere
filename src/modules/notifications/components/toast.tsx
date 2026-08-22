"use client";

import React, { createContext, useCallback, useState } from "react";
import type { Toast, ToastType } from "../types/notification.types";

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

export const ToastContext = createContext<ToastContextValue>({
  toast: {
    success: () => {},
    error: () => {},
    warning: () => {},
    info: () => {},
  },
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newToast: Toast = { id, type, message, duration };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toast: {
          success: (msg, dur) => addToast("success", msg, dur),
          error: (msg, dur) => addToast("error", msg, dur),
          warning: (msg, dur) => addToast("warning", msg, dur),
          info: (msg, dur) => addToast("info", msg, dur),
        },
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const bgMap: Record<ToastType, string> = {
    success: "bg-[var(--color-success)]",
    error: "bg-[var(--color-error)]",
    warning: "bg-[var(--color-warning)]",
    info: "bg-[var(--color-primary)]",
  };

  return (
    <div
      className={`${bgMap[toast.type]} text-white px-4 py-3 rounded-[var(--radius-md)] shadow-lg flex items-center justify-between gap-3 animate-[slideUp_0.3s_ease-out]`}
    >
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-white/70 hover:text-white text-lg leading-none shrink-0"
      >
        &times;
      </button>
    </div>
  );
}

export { ToastContainer };
