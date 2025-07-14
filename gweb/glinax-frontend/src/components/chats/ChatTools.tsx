"use client";

import ToolCard from "./ToolCard";

interface Props {
  onGenerateQuestions: () => void;
  onSummarize: () => void;
}

export default function ChatTools({ onGenerateQuestions, onSummarize }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 mt-14 md:mt-0">
      <ToolCard
        title="Generate Questions"
        color="bg-blue-100"
        icon="🧠"
        onClick={onGenerateQuestions}
      />
      <ToolCard
        title="Summarize File"
        color="bg-green-100"
        icon="📄"
        onClick={onSummarize}
      />
      <ToolCard title="Convert to Audio" color="bg-yellow-100" icon="🔊" />
      <ToolCard title="Transcribe Audio" color="bg-purple-100" icon="🎤" />
    </div>
  );
}

