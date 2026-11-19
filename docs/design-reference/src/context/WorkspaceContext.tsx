import React, { createContext, useContext, useState } from 'react';
import { Workspace } from '../mock/types';
import { mockWorkspaces } from '../mock';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  setActiveWorkspaceId: (id: string) => void;
  createWorkspace: (name: string, plan: 'developer' | 'team') => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(mockWorkspaces);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(mockWorkspaces[0].id);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const setActiveWorkspaceId = (id: string) => {
    if (workspaces.some((w) => w.id === id)) {
      setActiveWorkspaceIdState(id);
    }
  };

  const createWorkspace = (name: string, plan: 'developer' | 'team') => {
    const newWs: Workspace = {
      id: `ws_${Date.now()}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      plan,
      membersCount: 1,
      role: 'owner',
      currentLinksCount: 0,
      maxLinks: plan === 'team' ? 5000 : 1000,
      monthlyClicks: 0,
      maxMonthlyClicks: plan === 'team' ? 250000 : 25000,
      customDomains: [],
    };
    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspaceIdState(newWs.id);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspaceId,
        createWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
