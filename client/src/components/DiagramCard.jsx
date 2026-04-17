import { useState } from 'react';

export default function DiagramCard({ diagram }) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied]     = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(diagram.pumlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPng = () => {
    const a = document.createElement('a');
    a.href = diagram.renderUrl;
    a.download = `${diagram.type}-diagram.png`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Rendered diagram image */}
      <div className="p-4 bg-gray-50 flex justify-center min-h-64">
        <img
          src={diagram.renderUrl}
          alt={`${diagram.type} diagram`}
          className="max-w-full object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <p className="hidden text-sm text-red-500 mt-4">
          Could not render diagram. Try viewing the PlantUML code directly.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white">
        <button
          onClick={() => setShowCode((v) => !v)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {showCode ? 'Hide Code' : 'View PlantUML'}
        </button>
        <button
          onClick={copyCode}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy Code'}
        </button>
        <button
          onClick={downloadPng}
          className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors ml-auto"
        >
          Download PNG
        </button>
      </div>

      {/* PlantUML code block */}
      {showCode && (
        <div className="border-t border-gray-100">
          <pre className="p-4 text-xs bg-gray-900 text-green-300 overflow-x-auto whitespace-pre-wrap">
            {diagram.pumlCode}
          </pre>
        </div>
      )}
    </div>
  );
}
