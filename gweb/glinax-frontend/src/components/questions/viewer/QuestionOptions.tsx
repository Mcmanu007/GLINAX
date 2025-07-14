export default function QuestionOptions({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (opt: string) => void;
}) {
  if (!Array.isArray(options) || options.length === 0) {
    return <div className="text-red-500">⚠️ MCQ but no options available</div>;
  }

  return (
    <div className="space-y-2">
      {options.map((opt, idx) => (
        <label key={idx} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}
