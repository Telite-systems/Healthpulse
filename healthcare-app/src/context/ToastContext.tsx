import { createContext, useContext, type ReactNode } from 'react';
import { useToast, type Toast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';

interface ToastContextType {
  toasts: Toast[];
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast();

  return (
    <ToastContext.Provider value={{
      toasts: toast.toasts,
      success: toast.success,
      error: toast.error,
      info: toast.info,
      warning: toast.warning,
      removeToast: toast.removeToast,
    }}>
      {children}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider');
  return ctx;
}
