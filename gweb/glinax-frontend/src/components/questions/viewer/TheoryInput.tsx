export default function TheoryInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      className="w-full border p-2 rounded"
      placeholder="Type your answer here..."
    />
  );
}
