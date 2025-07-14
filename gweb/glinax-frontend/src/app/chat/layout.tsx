"use client";

import Sidebar from "@/components/Sidebar";
import { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [chatId, setChatId] = useState<number | null>(null);
  const [chatTitles, setChatTitles] = useState<{ id: number; title: string }[]>([]);
  const [showShareModalFor, setShowShareModalFor] = useState<number | null>(null);
  const [showCollaboratorModalFor, setShowCollaboratorModalFor] = useState<{
    id: number;
    title: string;
  } | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleChatChange = (newId: number | null) => {
    if (newId) localStorage.setItem("chatId", String(newId));
    else localStorage.removeItem("chatId");
    setChatId(newId);
    setSidebarOpen(false);
  };

  const handleChatListUpdate = (updated: { id: number; title: string }[]) => {
    setChatTitles(updated);
  };

  return (
    <div className="flex h-screen">
      <Sidebar
                chatId={chatId}
                onChatSelect={handleChatChange}
                chatTitles={chatTitles}
                onChatListUpdate={handleChatListUpdate}
                onShareChat={(chatId) => setShowShareModalFor(chatId)}
                onViewCollaborators={(id, title) =>
                  setShowCollaboratorModalFor({ id, title })
                }
              />

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
