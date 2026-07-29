import React, { createContext, useContext, useMemo, useState } from 'react';

type NotificationItem = { id: string; title: string; message: string; read?: boolean };

type NotificationCtx = {
  items: NotificationItem[];
  unreadCount: number;
  setItems: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
};

const NotificationContext = createContext<NotificationCtx | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const value = useMemo(
    () => ({
      items,
      setItems,
      unreadCount: items.filter((i) => !i.read).length,
    }),
    [items],
  );
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
