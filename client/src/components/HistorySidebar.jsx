import { useEffect, useState } from 'react';
import { fetchSessions, deleteSession } from '../services/api';
import { useAgent } from '../context/AgentContext';

export default function HistorySidebar({ onSelect }) {
  const [sessions, setSessions] = useState([]);
  const { sessionId } = useAgent();

  useEffect(() => {
    fetchSessions()
      .then((res) => setSessions(res.data))
      .catch(() => {});
  }, [sessionId]); // Refresh when a new session is saved

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s._id !== id));
  };

  return (
    <aside className="w-64 h-full border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">History</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <p className="text-xs text-gray-400 px-4 py-6 text-center">
            No sessions yet. Generate your first diagram!
          </p>
        )}
        {sessions.map((s) => (
          <div
            key={s._id}
            onClick={() => onSelect(s._id)}
            className={`group flex items-start justify-between gap-2 px-4 py-3 cursor-pointer
              border-b border-gray-100 hover:bg-white transition-colors
              ${sessionId === s._id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{s.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(s.createdAt).toLocaleDateString()}
                {' · '}
                {s.diagrams?.length || 0} diagrams
              </p>
            </div>
            <button
              onClick={(e) => handleDelete(s._id, e)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600
                         text-xs transition-opacity shrink-0 mt-0.5"
              title="Delete session"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
