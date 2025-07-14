import { Question } from "@/types/Question";
import { JSX } from "react";

export function renderMCQ(
  q: Question,
  userAns: string[],
  toggle: (opt: string) => void
): JSX.Element {
  try {
    if (!q.options || q.options.length === 0) {
      return <div className="text-red-500">⚠️ No options provided.</div>;
    }

    const selected = userAns[0] || ""; // Only one allowed

    return (
      <div className="space-y-2">
        {q.options.map((opt, idx) => (
          <label key={idx} className="flex items-center gap-2 cursor-pointer">
            <input
  type="radio"
  name={`mcq-${q.id}`} // ✅ ensures grouped radio per question
  value={opt}
  checked={userAns[0] === opt} // ✅ check only the selected one
  onChange={() => toggle(opt)} // ✅ triggers update
/>

            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  } catch (error) {
    console.error("❌ Error rendering MCQ:", error);
    return <div className="text-red-600">❌ Error rendering MCQ.</div>;
  }
}


export function renderTheory(
  q: Question,
  userAns: string,
  onInput: (val: string) => void
): JSX.Element {
  try {
    console.debug("📝 Rendering Theory Question:", q);

    return (
      <textarea
        value={userAns}
        onChange={(e) => {
          console.debug("✍️ Theory input changed for question ID:", q.id, "Value:", e.target.value);
          onInput(e.target.value);
        }}
        rows={4}
        className="w-full border p-2 rounded"
        placeholder="Type your answer here..."
      />
    );
  } catch (error) {
    console.error("❌ Error rendering theory question:", error, q);
    return (
      <div className="text-red-600">
        ❌ Error rendering theory input. Please try again.
      </div>
    );
  }
}
