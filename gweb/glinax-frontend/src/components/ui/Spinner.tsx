// components/ui/Spinner.tsx
import { cn } from "@/lib/utils";

export default function Spinner({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={cn("animate-spin rounded-full border-t-2 border-blue-600 border-solid", className)}
      style={{ width: size, height: size, borderWidth: size / 8 }}
    />
  );
}
