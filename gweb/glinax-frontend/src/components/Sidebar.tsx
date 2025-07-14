"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  LogOut,
  UsersRound,
  Bell,
BellPlus,
} from "lucide-react";
import ChatContextMenu from "./collaboration/ChatContextMenu";
import {
  getPendingCollaborations,
  approveCollaboration,
  rejectCollaboration,
} from "@/lib/api/collaboration";
import RenameModal from "./RenameModal";
import ConfirmModal from "@/components/ConfirmModal";
import CollaboratorModal from "./collaboration/CollaboratorModal";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { getChatHistory } from "@/lib/getChatHistory";

interface ChatItem {
  id: number;
  title: string;
  is_approved?: boolean;
  access_level?: "view" | "edit";
  owner?: { username: string };
  collaborators?: any[];
}
interface SidebarProps {
  chatId: number | null;
  onChatSelect: (id: number | null) => void;
  chatTitles: ChatItem[];
  onChatListUpdate: (chats: ChatItem[]) => void;
  onShareChat: (chatId: number) => void;
  onViewCollaborators: (chatId: number, title: string) => void; // 👈 NEW
}


export default function Sidebar({
  chatId,
  onChatSelect,
  chatTitles,
  onChatListUpdate,
  onShareChat,
  onViewCollaborators
  
}: SidebarProps) {
  const [error, setError] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [collabModalChat, setCollabModalChat] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const router = useRouter();
  const currentUsername =
    typeof window !== "undefined" ? localStorage.getItem("username") : "";

  const fetchChats = async () => {
    const { error, data } = await getChatHistory();
    if (error) {
      setError(error);
      return;
    }

    const visibleChats = data.filter(
      (chat: ChatItem) => chat.is_approved !== false
    );
    onChatListUpdate(visibleChats);
    setError(null);

    if (!visibleChats.find((c) => c.id === chatId)) {
      onChatSelect(visibleChats[0]?.id || null);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "access" && e.newValue) fetchChats();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

const handleViewCollaborators = (chatId: number) => {
  const chat = chatTitles.find((c) => c.id === chatId);
  if (chat) {
    onViewCollaborators(chat.id, chat.title);
  }
};
  const handleNewChat = async () => {
    try {
      const res = await api.post("/chat/start/");
      const newChat = { id: res.data.chat_id, title: res.data.title };
      onChatSelect(newChat.id);
      onChatListUpdate([newChat, ...chatTitles]);
    } catch {
      setError("Unable to start new chat. Please try again.");
    }
  };

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await getPendingCollaborations();
        setPending(res);
      } catch {
        toast.error("Failed to load collaboration invites.");
      }
    };
    fetchPending();
  }, []);

  const handleApprove = async (chatId: number) => {
    setActionLoading(true);
    try {
      await approveCollaboration(chatId);
      toast.success("Accepted collaboration");
      setPending((prev) =>
        prev.filter((c) => (c.id ?? c.chat_id) !== chatId)
      );
      await fetchChats();
      onChatSelect(chatId);
    } catch {
      toast.error("Failed to approve collaboration.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (chatId: number) => {
    setActionLoading(true);
    try {
      await rejectCollaboration(chatId);
      toast.success("Declined invitation");
      setPending((prev) =>
        prev.filter((c) => (c.id ?? c.chat_id) !== chatId)
      );
    } catch {
      toast.error("Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    router.push("/auth/login");
  };

  const openRename = (id: number) => {
    setActiveChat(id);
    setRenameOpen(true);
  };

  const openDelete = (id: number) => {
    setActiveChat(id);
    setDeleteOpen(true);
  };

  


  const onConfirmedDelete = async () => {
    if (!activeChat) return;
    try {
      await api.post(`/chat/${activeChat}/delete/`);
      toast.success("Chat deleted");
      fetchChats();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteOpen(false);
    }
  };

  return (
    <div className="w-64 bg-gray-100 border-r p-4 flex flex-col h-screen pt-16 md:pt-4">
      {/* Modals */}
      <ConfirmModal
        open={deleteOpen}
        title="Delete Chat?"
        message="Are you sure you want to delete this chat?"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={onConfirmedDelete}
        
      />
      <RenameModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        chatId={activeChat}
        onSaved={() => {
          toast.success("Renamed!");
          fetchChats();
        }}
      />
        <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Chats</h2>
        <div className="flex items-center space-x-3">
          <button onClick={handleNewChat} title="New Chat">
            <Plus className="w-5 h-5 text-blue-600" />
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown((prev) => !prev)}
            title="Pending Invitations"
          >
            <BellPlus className={pending.length>0 ? "animate-pulse" : "h-5 w-5"}/>
             

            {pending.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
                {pending.length}
              </span>
            )}
          </button>
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 bg-white shadow-lg border rounded p-3 z-50 w-64">
              <h3 className="text-sm font-semibold mb-2">
                Pending Invitations
              </h3>
              {pending.length === 0 ? (
                <p className="text-gray-500 text-sm">No invitations</p>
              ) : (
                <ul className="space-y-2 max-h-60 overflow-auto">
                  {pending.map((chat) => {
                    const chatId = chat.id ?? chat.chat_id;
                    return (
                      <li key={`pending-${chatId}`} className="border-b pb-2">
                        <p className="font-medium">{chat.title || "Untitled"}</p>
                        <p className="text-gray-500 text-xs mb-1">
                          Shared by {chat.owner?.username || "Unknown"}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(chatId)}
                            className="bg-blue-600 text-white px-2 py-1 text-xs rounded hover:bg-blue-700"
                            disabled={actionLoading}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(chatId)}
                            className="bg-gray-300 text-black px-2 py-1 text-xs rounded hover:bg-gray-400"
                            disabled={actionLoading}
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {error ? (
          <p className="text-sm text-red-500">
            {error === "Unauthorized" ? "Login to view chats." : error}
          </p>
        ) : chatTitles.length === 0 ? (
          <p className="text-sm text-gray-500">No chats yet.</p>
        ) : (
          chatTitles.map((chat) => {
            const isOwner = chat.owner?.username === currentUsername;
            const canEdit = chat.access_level === "edit" || isOwner;

            const numCollaborators =
              chat.collaborators?.length || (isOwner ? 0 : 1);

            return (
              <div
                key={chat.id}
                className={`group flex items-center justify-between px-1 py-1 rounded rounded-2xl ${
                  chatId === chat.id ? "bg-white" : "hover:bg-gray-200"
                }`}
                title={
                  numCollaborators > 0
                    ? `${numCollaborators} collaborator${numCollaborators > 1 ? "s" : ""}`
                    : "Not shared"
                }
              >
                <button
                  onClick={() => onChatSelect(chat.id)}
                  className="truncate text-left flex-1 pl-2"
                >
                  {chat.title || "Untitled"}
                </button>

                {/* Right side actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleViewCollaborators(chat.id)}
                    className="p-1 text-gray-600 hover:text-blue-600"
                    title="View collaborators"
                  >
                    <UsersRound size={16} />
                  </button>
                  <ChatContextMenu
                    chatId={chat.id}
                    onShare={() => onShareChat(chat.id)}
                    onRename={() => openRename(chat.id)}
                    onDelete={() => openDelete(chat.id)}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 mt-4 text-sm text-red-600 hover:text-red-800"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
}
