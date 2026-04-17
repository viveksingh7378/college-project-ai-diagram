import { createContext, useContext, useState } from 'react';

const AgentContext = createContext();

export const AgentProvider = ({ children }) => {
  const [diagrams, setDiagrams]           = useState([]);       // Current diagrams
  const [sessionId, setSessionId]         = useState(null);     // Active session
  const [systemName, setSystemName]       = useState('');       // Detected system name
  const [status, setStatus]               = useState('idle');   // idle | loading | success | clarifying | error
  const [clarifyQuestion, setClarifyQ]    = useState('');       // Agent's follow-up question
  const [activeDiagramType, setActiveTab] = useState('usecase');// Active diagram tab
  const [history, setHistory]             = useState([]);        // Chat messages

  const addMessage = (role, content) =>
    setHistory((prev) => [...prev, { role, content, ts: Date.now() }]);

  const reset = () => {
    setDiagrams([]);
    setSessionId(null);
    setSystemName('');
    setStatus('idle');
    setClarifyQ('');
    setHistory([]);
    setActiveTab('usecase');
  };

  return (
    <AgentContext.Provider value={{
      diagrams, setDiagrams,
      sessionId, setSessionId,
      systemName, setSystemName,
      status, setStatus,
      clarifyQuestion, setClarifyQ,
      activeDiagramType, setActiveTab,
      history, addMessage,
      reset,
    }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = () => useContext(AgentContext);
