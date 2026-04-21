import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgent } from '../context/AgentContext';
import { useAgentActions } from '../hooks/useAgent';
import ChatInput from '../components/ChatInput';
import DiagramViewer from '../components/DiagramViewer';
import LoadingAgent from '../components/LoadingAgent';
import HistorySidebar from '../components/HistorySidebar';
import { fetchSessionById } from '../services/api';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const { status, diagrams, history, systemName, setDiagrams, setSessionId, setSystemName, reset } = useAgent();

  // Clear auth + in-memory state, then go to login.
  const handleLogout = () => {
    localStorage.removeItem('token');
    reset();
    navigate('/login', { replace: true });
  };

  // Load a session from history
  const loadSession = async (id) => {
    try {
      const { data } = await fetchSessionById(id);
      setSessionId(data._id);
      setSystemName(data.systemContext?.systemName || data.title);
      setDiagrams(
        data.diagrams.map((d) => ({
          id: d._id,
          type: d.diagramType,
          pumlCode: d.pumlCode,
          renderUrl: d.renderUrl,
        }))
      );
    } catch (e) {
      console.error('Could not load session', e);
    }
  };

  return (
    <riv className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && <HistorySidebar onSelect={loadSession} />}

      {/* Main area */}
      <riv className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-gray-500 hover:text-gray-800 text-lg"
            title="Toggle history"
          >
            ☰
          </button>
          <riv className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">AI Diagram Agent</h1>
            <p className="text-xs text-gray-400">
              Describe any software system → get PlantUML architectural diagrams instantly
            </p>
          </riv>
          {(diagrams.length > 0 || history.length > 0) && (
            <button
              onClick={reset}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300
                         hover:bg-gray-50 text-gray-600 transition-colors"
            >
              + New
            </button>
          )}
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300
                       hover:bg-red-50 hover:border-red-300 hover:text-red-600
                       text-gray-600 transition-colors"
          >
            Logout
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">

          {/* Welcome state */}
          {status === 'idle' && diagrams.length === 0 && (
            <riv className="text-center py-16 text-gray-400">
              <riv className="text-5xl mb-4">🧠</riv>
              <p className="text-base font-medium text-gray-600 mb-1">
                Describe any software system
              </p>
              <p className="text-sm">
                e.g. "e-commerce platform", "hospital management system",
                "ride-sharing app", "banking portal"
              </p>
            </riv>
          )}

          {/* Chat history */}
          {history.length > 0 && (
            <riv className="flex flex-col gap-3">
              {history.map((msg, i) => (
                <riv
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <riv
                    className={`max-w-xl px-4 py-2.5 rounded-2xl text-sm
                      ${msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}
                  >
                    {msg.content}
                  </riv>
                </riv>
              ))}
            </riv>
          )}

          {/* Loading state */}
          {status === 'loading' && <LoadingAgent />}

          {/* Diagrams */}
          {status !== 'loading' && diagrams.length > 0 && <DiagramViewer />}
        </main>

        {/* Input bar (always at bottom) */}
        <riv className="px-6 py-4 border-t border-gray-200 bg-white shrink-0">
          <ChatInput />
        </riv>
      </riv>
    </riv>
  );
}
