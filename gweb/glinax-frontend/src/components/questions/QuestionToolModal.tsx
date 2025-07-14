"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";

interface Question {
  id: number;
  question: string;
  answer?: string;
  difficulty?: string;
  category?: string;
  image_url?: string;
  type?: "mcq" | "theory";
  options?: string[];
}

interface QuestionModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (prompt: string, questions: Question[], context: string) => void;
}

export default function QuestionModal({
  open,
  onClose,
  onGenerated,
}: QuestionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mcq, setMcq] = useState(true);
  const [theory, setTheory] = useState(false);
  const [visual, setVisual] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);

    if (!file) {
      setError("Please upload a file.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "qa");

      const uploadRes = await api.post("/files/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const fileId = uploadRes.data.id || uploadRes.data.file_id;
      if (!fileId) throw new Error("File upload failed.");

      const mode = mcq && theory ? "both" : mcq ? "mcq" : "theory";

      const genRes = await api.post("/questions/generate/", {
        source_type: "file",
        source_id: fileId,
        mode,
        visuals: visual,
        difficulty,
        num_questions: numQuestions,
      });

      const questions = genRes.data.questions;
      const context = genRes.data.context || "";

      if (!questions || questions.length === 0) {
        throw new Error("No questions were generated.");
      }

      onGenerated("Generate questions from uploaded file", questions, context);

      setTimeout(() => {
        onClose();
      }, 100);
    } catch (err: any) {
      const message =
        err?.response?.data?.error || err.message || "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🧠 Generate Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-4">
            <Label>Upload Source File (PDF, PPTX, DOCX)</Label>
            <Input
              type="file"
              accept=".pdf,.docx,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label># Questions</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
              />
            </div>

            <div className="flex items-center gap-2 mt-6">
              <Checkbox checked={mcq} onCheckedChange={(val) => setMcq(!!val)} />
              <Label>MCQs</Label>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <Checkbox checked={theory} onCheckedChange={(val) => setTheory(!!val)} />
              <Label>Theory</Label>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <Checkbox checked={visual} onCheckedChange={(val) => setVisual(!!val)} />
              <Label>Visuals</Label>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? "Generating..." : "Generate Questions"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
