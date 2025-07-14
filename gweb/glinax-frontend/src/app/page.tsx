"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatBox from "@/components/ChatBox";
import CollaboratorModal from "@/components/collaboration/CollaboratorModal";
import FloatingActionMenu from "@/components/FloatingActionMenu";
import { useRouter } from "next/navigation";
import { XCircle, Menu, Archive } from "lucide-react";

export default function HomePage() {
  const [chatId, setChatId] = useState<number | null>(null);
  const [chatTitles, setChatTitles] = useState<{ id: number; title: string }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showShareModalFor, setShowShareModalFor] = useState<number | null>(null);
  const [showCollaboratorModalFor, setShowCollaboratorModalFor] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const router = useRouter();

  const handleChatChange = (newId: number | null) => {
    if (newId) localStorage.setItem("chatId", String(newId));
    else localStorage.removeItem("chatId");
    setChatId(newId);
    setSidebarOpen(false);
  };

  const handleChatListUpdate = (updated: { id: number; title: string }[]) => {
    setChatTitles(updated);
  };

  const handleTitleUpdate = (id: number, newTitle: string) => {
    setChatTitles((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, title: newTitle } : chat))
    );
  };

  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Sidebar toggle - mobile */}
      <div className="absolute top-4 left-4 z-50 md:hidden flex items-center space-x-2">
        {!sidebarOpen ? (
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-blue-600 transition"
            title="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-600 hover:text-red-500 transition"
            title="Close sidebar"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Inventory icon - mobile */}
      <div className="absolute top-4 right-4 z-50 md:hidden">
        <button
          title="Go to Inventory"
          onClick={() => router.push("/inventory")}
          className="text-gray-600 hover:text-blue-600 transition"
        >
          <Archive className="w-6 h-6" />
        </button>
      </div>

      {/* Overlay when sidebar is open on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-md transition-transform duration-300 transform
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:shadow-none`}
      >
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
      </div>

      {/* ChatBox */}
      <div className="flex-1 overflow-hidden">
        <ChatBox
          chatId={chatId}
          onChatChange={handleChatChange}
          onTitleUpdate={handleTitleUpdate}
        />
      </div>

      {/* Collaborator Modal */}
      {showCollaboratorModalFor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <CollaboratorModal
            chatId={showCollaboratorModalFor.id}
            chatTitle={showCollaboratorModalFor.title}
            onClose={() => setShowCollaboratorModalFor(null)}
          />
        </div>
      )}

      {/* Share Modal */}
      {showShareModalFor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <CollaboratorModal
            chatId={showShareModalFor}
            chatTitle={
              chatTitles.find((c) => c.id === showShareModalFor)?.title || ""
            }
            onClose={() => setShowShareModalFor(null)}
          />
        </div>
      )}

      {/* Floating actions (desktop only) */}
      <div className="hidden md:block">
        <FloatingActionMenu />
      </div>
    </div>
  );
}
