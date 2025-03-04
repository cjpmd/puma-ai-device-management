
import { createContext, useContext, useState } from 'react';
import { TrainingStats } from './MLTrainingContext';

interface SessionContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const defaultContext: SessionContextType = {
  activeTab: 'upload',
  setActiveTab: () => {},
};

export const SessionContext = createContext<SessionContextType>(defaultContext);

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ 
  children, 
  onTrainingProgress 
}: { 
  children: React.ReactNode;
  onTrainingProgress: (stats: TrainingStats) => void;
}) => {
  const [activeTab, setActiveTab] = useState<string>('upload');

  return (
    <SessionContext.Provider value={{
      activeTab,
      setActiveTab,
    }}>
      {children}
    </SessionContext.Provider>
  );
};
