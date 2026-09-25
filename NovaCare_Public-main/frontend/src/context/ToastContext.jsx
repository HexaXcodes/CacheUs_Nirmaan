import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-xs w-full">
        {toasts.map(t => (
          <div key={t.id} onClick={() => dismiss(t.id)}
            className={`relative cursor-pointer border-l-4 px-4 py-3 bg-hud-surface font-mono text-xs tracking-wide uppercase
              ${t.type === 'error'   ? 'border-tier-red   text-tier-red'   :
                t.type === 'success' ? 'border-tier-green text-tier-green' :
                t.type === 'warning' ? 'border-tier-amber text-tier-amber' :
                                       'border-hud-cyan   text-hud-cyan'}`}>
            <span className="block">{t.message}</span>
            <span className="absolute top-2 right-2 text-current opacity-50">X</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
