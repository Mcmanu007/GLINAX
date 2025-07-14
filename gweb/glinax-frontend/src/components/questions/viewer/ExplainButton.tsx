"use client";

import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { Question } from "../../../types/Question";

interface Props {
  question: Question;
  context: string;
}

export default function ExplainButton({ question, context }: Props) {
  const handleExplain = () => {
    if (!question.question || !question.answer) {
      console.warn("⚠️ Missing question or answer.");
      return;
    }

    const event = new CustomEvent("gpt-question-explain", {
      detail: {
        question: question.question,
        answer: question.answer,
        context: context,
      },
    });

    window.dispatchEvent(event);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExplain}
      className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900"
    >
      <Lightbulb className="w-4 h-4" />
      Explain Answer
    </Button>
  );
}
