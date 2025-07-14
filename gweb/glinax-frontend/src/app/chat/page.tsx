"use client";

import ChatBox from "@/components/ChatBox";
import { useState } from "react";

export default function ChatPage() {
  const [chatId, setChatId] = useState<number | null>(null);
  const [chatTitles, setChatTitles] = useState<{ id: number; title: string }[]>([]);

  const handleTitleUpdate = (id: number, newTitle: string) => {
    setChatTitles((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, title: newTitle } : chat))
    );
  };

  return (
    <ChatBox
      chatId={chatId}
      onChatChange={setChatId}
      onTitleUpdate={handleTitleUpdate}
    />
  );
}
