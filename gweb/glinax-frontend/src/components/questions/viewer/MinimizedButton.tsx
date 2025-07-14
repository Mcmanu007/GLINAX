import { Button } from "@/components/ui/button";

export default function MinimizedButton({ onRestore }: { onRestore: () => void }) {
  return (
    <div className="fixed bottom-20 right-6 z-50">
      <Button onClick={onRestore} className="rounded-full px-4 py-2 shadow">
        📋 Questions
      </Button>
    </div>
  );
}
