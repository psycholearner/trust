import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
}

interface NotificationContextType {
  addNotification: (type: NotificationType, message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: NotificationType, message: string, title?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, message, title }]);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed top-20 right-4 z-[60] flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto transform transition-all duration-300 ease-in-out animate-slideIn flex items-start p-4 rounded-lg shadow-xl border-l-4 backdrop-blur-sm ${
              n.type === 'success' ? 'bg-white/95 border-green-500 text-slate-800' :
              n.type === 'error' ? 'bg-white/95 border-red-500 text-slate-800' :
              n.type === 'warning' ? 'bg-white/95 border-yellow-500 text-slate-800' :
              'bg-white/95 border-brand-500 text-slate-800'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {n.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {n.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
              {n.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
              {n.type === 'info' && <Info className="h-5 w-5 text-brand-500" />}
            </div>
            <div className="ml-3 w-0 flex-1">
              {n.title && <p className="text-sm font-semibold text-slate-900">{n.title}</p>}
              <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="bg-transparent rounded-md inline-flex text-slate-400 hover:text-slate-500 focus:outline-none"
                onClick={() => removeNotification(n.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};