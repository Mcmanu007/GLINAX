import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function QuestionFooter({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex justify-between mt-6">
      <Button variant="ghost" disabled={current === 0} onClick={onPrev}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Back
      </Button>
      <Button variant="ghost" disabled={current === total - 1} onClick={onNext}>
        Next <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
