import { Button } from "@/components/ui/button";
import { Archive, X } from "lucide-react";

export default function QuestionHeader({
  current,
  total,
  type,
  onMinimize,
  onClose,
}: {
  current: number;
  total: number;
  type: string;
  onMinimize: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="text-sm text-gray-600">
        Question {current + 1} of {total} ({type})
      </div>
      <div className="flex gap-2 items-center">
        <Button variant="ghost" size="icon" onClick={onMinimize}>
          <Archive className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
