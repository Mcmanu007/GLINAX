"use client";

import { useRef, useState, useEffect } from "react";
import { SendHorizonal, Loader2, CircleFadingArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function ChatInput({
  input,
  onInputChange,
  onSend,
  disabled = false,
  loading = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [rows, setRows] = useState(1);

  useEffect(() => {
    if (!textareaRef.current) return;

    const lineCount = (input.match(/\n/g) || []).length + 1;
    const newRowCount = Math.min(10, Math.max(5, lineCount));
    setRows(newRowCount);
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="relative w-full mt-4">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        disabled={disabled || loading}
        className={cn(
          "w-full px-4 pr-12 py-2 border text-sm shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200",
          rows > 1 ? "rounded-md" : "rounded-4xl",
          disabled && "bg-gray-100 text-gray-400 cursor-not-allowed"
        )}
      />

      <button
  onClick={onSend}
  disabled={disabled || loading}
  className="absolute bottom-5 right-2 text-blue-600 hover:text-blue-800 transition"
>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <CircleFadingArrowUp className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
