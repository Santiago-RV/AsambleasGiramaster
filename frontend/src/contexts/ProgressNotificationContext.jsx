import { createContext, useContext, useState, useCallback } from 'react';

const ProgressNotificationContext = createContext({
  notifications: [],
  startProgress: () => {},
  updateProgress: () => {},
  finishProgress: () => {},
  removeNotification: () => {},
});

export const useProgressNotification = () => useContext(ProgressNotificationContext);

let globalStartProgress = null;
let globalUpdateProgress = null;
let globalFinishProgress = null;
let globalRemoveNotification = null;

export const startProgressNotification = (data) => {
  if (globalStartProgress) {
    globalStartProgress(data);
  }
};

export const updateProgressNotification = (data) => {
  if (globalUpdateProgress) {
    globalUpdateProgress(data);
  }
};

export const finishProgressNotification = (data) => {
  if (globalFinishProgress) {
    globalFinishProgress(data);
  }
};

export const removeProgressNotification = (id) => {
  if (globalRemoveNotification) {
    globalRemoveNotification(id);
  }
};

export const ProgressNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const startProgress = useCallback((data) => {
    const id = Date.now();
    setNotifications((prev) => [
      ...prev,
      {
        id,
        current: 0,
        total: data.total || 0,
        title: data.title || 'Procesando',
        message: data.message || '',
        type: data.type || 'info',
        status: 'processing',
        progress: 0,
      },
    ]);
    return id;
  }, []);

  const updateProgress = useCallback((data) => {
    setNotifications((prev) =>
      prev.map((notif) => {
        if (data.id !== undefined && notif.id !== data.id) return notif;
        return {
          ...notif,
          current: data.current ?? notif.current,
          total: data.total ?? notif.total,
          message: data.message ?? notif.message,
          status: data.status ?? notif.status,
          progress: data.progress ?? notif.progress,
        };
      })
    );
  }, []);

  const finishProgress = useCallback((data) => {
    setNotifications((prev) =>
      prev.map((notif) => {
        if (data.id !== undefined && notif.id !== data.id) return notif;
        return {
          ...notif,
          status: data.status || 'completed',
          message: data.message || (data.status === 'completed' ? 'Completado' : 'Error'),
          progress: data.status === 'completed' ? 100 : notif.progress,
        };
      })
    );

    const statusToCheck = data.status || 'completed';
    const timeout = statusToCheck === 'completed' ? 3000 : 5000;

    setTimeout(() => {
      setNotifications((prev) => {
        if (data.id !== undefined) {
          return prev.filter((n) => n.id !== data.id);
        }
        return prev.slice(1);
      });
    }, timeout);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  globalStartProgress = startProgress;
  globalUpdateProgress = updateProgress;
  globalFinishProgress = finishProgress;
  globalRemoveNotification = removeNotification;

  return (
    <ProgressNotificationContext.Provider value={{ notifications, startProgress, updateProgress, finishProgress, removeNotification }}>
      {children}
    </ProgressNotificationContext.Provider>
  );
};
