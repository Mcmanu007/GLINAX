"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import MinimizedButton from "./viewer/MinimizedButton";
import QuestionHeader from "./viewer/QuestionHeader";
import AnswerDisplay from "./viewer/AnswerDisplay";
import QuestionFooter from "./viewer/QuestionFooter";
import ExplainButton from "./viewer/ExplainButton";
import { renderMCQ, renderTheory } from "./renderers";
import { Question } from "../../types/Question";
import api from "../../lib/api";
import Confetti from "react-confetti";
import ResultPopup from "./viewer/ResultPopup";
import { useWindowSize } from "react-use";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface Props {
  questions: Question[];
  context?: string;
  onClose: () => void;
  minimized: boolean;
  onMinimize: (min: boolean) => void;
}

export default function QuestionViewer({
  questions,
  context = "",
  onClose,
  minimized,
  onMinimize,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string[] }>({});
  const [answerVisibility, setAnswerVisibility] = useState<{ [key: number]: boolean }>({});
  const [showResult, setShowResult] = useState(false);
  const [finalScore, setFinalScore] = useState<{
    correct: number;
    total: number;
    percentage: number;
  } | null>(null);

  const { width, height } = useWindowSize();
  const router = useRouter();

  const q = questions[current];
  const isMCQ = q.type === "mcq" || (!!q.options && q.options.length > 0);
  const isTheory = q.type === "theory" || (!q.options || q.options.length === 0);
  const userAns = userAnswers[q.id] || [];
  const isAnswerShown = answerVisibility[q.id] || false;

  const handleToggleOption = (opt: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [q.id]: [opt],
    }));
  };

  const handleTheoryInput = (val: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [q.id]: [val],
    }));
  };

  const toggleAnswerVisibility = () => {
    setAnswerVisibility((prev) => ({
      ...prev,
      [q.id]: !prev[q.id],
    }));
  };

  const handleSubmit = async () => {
    try {
      const flatAnswers = Object.fromEntries(
        Object.entries(userAnswers).map(([id, val]) => [id, val[0]])
      );

      const response = await api.post("questions/score/", {
        context,
        questions,
        userAnswers: flatAnswers,
      });

      const score = response.data.score;

      // 🔒 Cleanup any session info
      localStorage.setItem("questionViewer", JSON.stringify({ submitted: true }));
      localStorage.removeItem("questions");
      localStorage.removeItem("question_context");

      setFinalScore(score);
      setShowResult(true);

      // 🎉 Toast and redirect after short delay
      toast.success("✅ Answers submitted! View results in your Inventory.", {
        duration: 3000,
      });

      setTimeout(() => {
        onClose(); // hide viewer
        router.push("/inventory");
      }, 3000);
    } catch (error) {
      console.error("❌ Submission failed:", error);
      toast.error("❌ Failed to submit answers. Please try again.");
    }
  };

  // 👇 Prevent it from showing if minimized
  if (minimized) {
    return <MinimizedButton onRestore={() => onMinimize(false)} />;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
      <div className="w-full max-w-2xl bg-white border rounded-lg shadow-xl p-6 relative">
        <QuestionHeader
          current={current}
          total={questions.length}
          type={q.type || "unknown"}
          onMinimize={() => onMinimize(true)}
          onClose={onClose}
        />

        {q.image_url && (
          <img
            src={q.image_url}
            alt="Visual Aid"
            className="w-full max-h-56 object-contain rounded mb-4"
          />
        )}

        <div className="font-medium mb-4">{q.question}</div>

        <div className="mb-2">
          {isMCQ && renderMCQ(q, userAns, handleToggleOption)}
          {isTheory && renderTheory(q, userAns[0] || "", handleTheoryInput)}
        </div>

        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={toggleAnswerVisibility}>
            {isAnswerShown ? "Hide Answer" : "Show Answer"}
          </Button>
          <ExplainButton question={q} context={context} />
        </div>

        {isAnswerShown && q.answer && <AnswerDisplay answer={q.answer} />}

        <QuestionFooter
          current={current}
          total={questions.length}
          onPrev={() => setCurrent((c) => c - 1)}
          onNext={() => setCurrent((c) => c + 1)}
        />

        {current === questions.length - 1 && (
          <div className="mt-4 text-right">
            <Button onClick={handleSubmit} className="bg-blue-600 text-white">
              Submit Answers
            </Button>
          </div>
        )}
      </div>

      {showResult && finalScore && (
        <>
          <Confetti width={width} height={height} />
          <ResultPopup
            score={finalScore}
            onClose={() => {
              setShowResult(false);
              // Final cleanup happens in handleSubmit now
            }}
          />
        </>
      )}
    </div>
  );
}
