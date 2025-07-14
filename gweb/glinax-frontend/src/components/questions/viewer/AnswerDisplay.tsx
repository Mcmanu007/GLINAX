export default function AnswerDisplay({ answer }: { answer: string }) {
  return (
    <div className="mt-4 p-2 bg-green-50 border border-green-200 text-green-800 rounded">
      <strong>Answer:</strong> {answer}
    </div>
  );
}
