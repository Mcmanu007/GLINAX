"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface Props {
  score: {
    correct: number;
    total: number;
    percentage: number;
  };
  onClose: () => void;
}

export default function ResultPopup({ score, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white p-6 rounded-2xl shadow-xl text-center w-[90%] max-w-md">
        <h2 className="text-xl font-semibold mb-2 text-green-600">🎉 Well done!</h2>
        <p className="text-lg font-medium mb-4">
          You scored <span className="text-blue-600">{score.correct}/{score.total}</span> 
          <br />
          (<span className="text-blue-500">{score.percentage}%</span>)
        </p>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
