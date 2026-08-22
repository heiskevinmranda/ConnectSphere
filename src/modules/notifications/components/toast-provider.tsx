"use client";

import { ToastProvider as BaseToastProvider } from "./toast";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <BaseToastProvider>{children}</BaseToastProvider>;
}
