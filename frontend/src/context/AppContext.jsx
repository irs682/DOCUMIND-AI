import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const addNotification = (notification) => {
    setNotifications((prev) => [...prev, { id: Date.now(), ...notification }]);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <AppContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      sidebarOpen,
      setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

export default AppContext;
