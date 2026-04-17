import { useState } from 'react';
import { useAgent } from '../context/AgentContext';
import DiagramCard from './DiagramCard';

const TAB_LABELS = {
  usecase:   'Use Case',
  class:     'Class',
  sequence:  'Sequence',
  component: 'Component',
};

export default function DiagramViewer() {
  const { diagrams, systemName, activeDiagramType, setActiveTab } = useAgent();

  if (!diagrams.length) return null;

  const activeDiagram = diagrams.find((d) => d.type === activeDiagramType) || diagrams[0];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">
          {systemName} — Architecture Diagrams
        </h2>
        <span className="text-xs text-gray-400">{diagrams.length} diagrams generated</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {diagrams.map((d) => (
          <button
            key={d.type}
            onClick={() => setActiveTab(d.type)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
              ${activeDiagramType === d.type
                ? 'bg-white border border-b-white border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {TAB_LABELS[d.type] || d.type}
          </button>
        ))}
      </div>

      {/* Active diagram */}
      {activeDiagram && <DiagramCard diagram={activeDiagram} />}
    </div>
  );
}
