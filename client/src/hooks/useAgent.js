import { useAgent } from '../context/AgentContext';
import { analyzePrompt, refineDiagrams } from '../services/api';

export const useAgentActions = () => {
  const {
    sessionId, setSessionId,
    setDiagrams, setSystemName,
    setStatus, setClarifyQ,
    addMessage,
  } = useAgent();

  /**
   * Send a new prompt (or clarification answer) to the agent
   */
  const sendPrompt = async (prompt) => {
    addMessage('user', prompt);
    setStatus('loading');

    try {
      const { data } = await analyzePrompt(prompt, sessionId);

      if (data.status === 'needs_clarification') {
        setSessionId(data.sessionId);
        setClarifyQ(data.question);
        addMessage('agent', data.question);
        setStatus('clarifying');
        return;
      }

      // Success
      setSessionId(data.sessionId);
      setSystemName(data.systemName);
      setDiagrams(data.diagrams);
      addMessage('agent', `Generated ${data.diagrams.length} diagrams for "${data.systemName}"`);
      setStatus('success');
    } catch (err) {
      addMessage('agent', 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  /**
   * Send a refinement request ("add a payment module", "show admin flow")
   */
  const sendRefinement = async (refinement) => {
    addMessage('user', refinement);
    setStatus('loading');

    try {
      const { data } = await refineDiagrams(refinement, sessionId);
      setDiagrams(data.diagrams);
      setSystemName(data.systemName);
      addMessage('agent', `Diagrams refined for "${data.systemName}"`);
      setStatus('success');
    } catch (err) {
      addMessage('agent', 'Could not refine diagrams. Please try again.');
      setStatus('error');
    }
  };

  return { sendPrompt, sendRefinement };
};
