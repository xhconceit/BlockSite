import { useState, useEffect, useCallback, type ReactNode } from 'react';

let toastId = 0;

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let addToastFn: ((message: string, type: 'success' | 'error' | 'info') => void) | null = null;

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  addToastFn?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  const typeStyles: Record<string, string> = {
    success: 'bg-green-500/20 border-green-500 text-green-400',
    error: 'bg-red-500/20 border-red-500 text-red-400',
    info: 'bg-blue-500/20 border-blue-500 text-blue-400',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2.5 rounded-lg border text-sm shadow-lg animate-slide-in ${typeStyles[toast.type]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
