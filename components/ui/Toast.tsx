import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

const listeners = new Set<(toast: ToastData) => void>();

export function showToast(message: string, type: ToastType = "info"): void {
  const toast: ToastData = { id: crypto.randomUUID(), message, type };
  for (const listener of listeners) {
    listener(toast);
  }
}

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handler = (toast: ToastData) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3000);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  if (toasts.length === 0) return <></>;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg animate-in slide-in-from-right duration-200 ${
            toast.type === "error"
              ? "bg-red-400/10 border border-red-400/30 text-red-400"
              : toast.type === "success"
                ? "bg-green-400/10 border border-green-400/30 text-green-400"
                : "bg-zinc-800 border border-zinc-700 text-zinc-100"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export { ToastContainer };
