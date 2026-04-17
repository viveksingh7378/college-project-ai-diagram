import { useState } from 'react';
import { useAgent } from '../context/AgentContext';
import { useAgentActions } from '../hooks/useAgent';

export default function ChatInput() {
  const [input, setInput] = useState('');
  const { status, clarifyQuestion, sessionId, diagrams } = useAgent();
  const { sendPrompt, sendRefinement } = useAgentActions();

  const isLoading = status === 'loading';

  // Decide which action to call
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');

    if (diagrams.length > 0) {
      // Already have diagrams → treat as refinement
      await sendRefinement(text);
    } else {
      // Fresh prompt or clarification answer
      await sendPrompt(text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Dynamic placeholder text
  const placeholder =
    status === 'clarifying'
      ? clarifyQuestion
      : diagrams.length > 0
      ? 'Refine diagrams... (e.g. "add a payment module")'
      : 'Describe any system... (e.g. "ride-sharing app with real-time tracking")';

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Clarification banner */}
      {status === 'clarifying' && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
          <span className="font-semibold">Agent needs more info: </span>
          {clarifyQuestion}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50
                     shadow-sm"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="h-12 px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold
                     hover:bg-blue-700 disabled:opacity-40 transition-colors shadow"
        >
          {isLoading ? '...' : diagrams.length > 0 ? 'Refine' : 'Generate'}
        </button>
      </div>
    </div>
  );
}
