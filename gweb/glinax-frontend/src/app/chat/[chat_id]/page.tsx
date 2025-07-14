"use client";

import { useEffect, useState } from "react";
import ChatBox from "@/components/ChatBox";
import { useParams, useRouter } from "next/navigation";
import { getChatHistory } from "@/lib/getChatHistory";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function ChatDetailPage() {
  const { chat_id } = useParams();
  const router = useRouter();

  const [chatId, setChatId] = useState<number | null>(null);
  const [chatTitles, setChatTitles] = useState<{ id: number; title: string }[]>([]);
  const [chatExists, setChatExists] = useState(true);

  useEffect(() => {
    if (!chat_id) return;

    const checkAccess = async () => {
      try {
        const res = await api.get(`/chat/history/${chat_id}/`);
        setChatId(Number(chat_id));
        setChatExists(true);
      } catch (err: any) {
        setChatExists(false);
        toast.error("You don’t have access to this chat or it doesn’t exist.");
      }
    };

    checkAccess();
  }, [chat_id]);

  const handleTitleUpdate = (id: number, newTitle: string) => {
    setChatTitles((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, title: newTitle } : chat))
    );
  };

  if (!chatExists) {
    return (
      <div className="p-4 text-center text-gray-700">
        <h1 className="text-xl font-semibold mb-2">We couldn't find that chat session.</h1>
        <p className="text-sm">It may have been deleted or you're not authorized to access it.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <ChatBox
        chatId={chatId}
        onChatChange={setChatId}
        onTitleUpdate={handleTitleUpdate}
      />
    </div>
  );
}
