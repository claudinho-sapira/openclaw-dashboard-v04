"use client"

import { useEffect, useState, createContext, useContext, useCallback } from "react"
import { CheckCircle2, AlertCircle, X } from "lucide-react"

interface Toast {
  id: string
  message: string
  type: "success" | "error"
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error") => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" data-testid="toast-container">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2 fade-in duration-200 ${
              t.type === "success"
                ? "bg-background text-foreground border-green-200"
                : "bg-background text-foreground border-red-200"
            }`}
            data-testid={`toast-${t.type}`}
          >
            {t.type === "success"
              ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              : <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            }
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="p-0.5 rounded hover:bg-muted shrink-0">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
