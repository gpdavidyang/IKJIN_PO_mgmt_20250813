import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  // Always keep sidebar expanded
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Remove localStorage logic since we're always expanded
  useEffect(() => {
    // Clear any existing collapsed state from localStorage
    localStorage.removeItem('sidebar-collapsed');
  }, []);

  const toggleSidebar = () => {
    // Do nothing - sidebar is always expanded
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed: false, setIsCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}