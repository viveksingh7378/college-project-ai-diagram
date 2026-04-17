const STEPS = [
  'Analyzing your system...',
  'Identifying actors & modules...',
  'Generating Use Case diagram...',
  'Generating Class diagram...',
  'Generating Sequence diagram...',
  'Generating Component diagram...',
  'Validating PlantUML syntax...',
];

export default function LoadingAgent() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />

      <p className="text-base font-semibold text-gray-700">Agent is working...</p>

      {/* Cascading step hints */}
      <div className="flex flex-col gap-1 text-xs text-gray-400">
        {STEPS.map((step, i) => (
          <span
            key={i}
            className="animate-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}
