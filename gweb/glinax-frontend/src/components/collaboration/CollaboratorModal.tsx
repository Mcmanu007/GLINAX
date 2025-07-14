"use client";

import { FC, useEffect, useState } from "react";
import {
  getUsers,
  shareWithUsers,
  shareWithEmail,
  getCollaborators,
  removeCollaborator,
  Collaborator,
} from "@/lib/api/collaboration";
import { toast } from "react-toastify";
import { X } from "lucide-react";

type CollaboratorModalProps = {
  chatId: number;
  chatTitle: string;
  onClose: () => void;
};

const CollaboratorModal: FC<CollaboratorModalProps> = ({
  chatId,
  chatTitle,
  onClose,
}) => {
  const [tab, setTab] = useState<"list" | "add">("list");
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const uname = localStorage.getItem("username");
    setCurrentUsername(uname);
  }, []);

  useEffect(() => {
    if (!currentUsername) return;
    const fetchCollaborators = async () => {
      try {
        const res = await getCollaborators(chatId);
        setCollaborators(res);
        const owner = res.find((c) => c.is_owner);
        setIsOwner(owner?.collaborator?.username === currentUsername);
      } catch (err) {
        console.error("Error fetching collaborators", err);
      }
    };
    fetchCollaborators();
  }, [chatId, currentUsername]);


  const fetchCollaborators = async () => {
    try {
      const res = await getCollaborators(chatId);
      setCollaborators(res);

      const owner = res.find((c) => c.is_owner);
      setIsOwner(owner?.collaborator.username === currentUsername);
    } catch (err) {
      console.error("Error fetching collaborators", err);
    }
  };

  useEffect(() => {
    if (tab === "add" && query.length >= 1) {
      getUsers(query)
        .then((res) => {
          const filtered = res.filter(
            (u: any) => u.username !== currentUsername
          );
          setUsers(filtered);
        })
        .catch(console.error);
    } else {
      setUsers([]);
    }
  }, [query, tab, currentUsername]);

  const toggleUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!isOwner) return;

    setLoading(true);
    try {
      if (selectedUsers.length > 0) {
        await shareWithUsers(chatId, selectedUsers, accessLevel);
        toast.success("Shared with selected users.");
      } else if (email) {
        await shareWithEmail(chatId, email, accessLevel);
        toast.success("Shared via email.");
      } else {
        toast.error("Please select users or provide an email.");
        return;
      }

      setEmail("");
      setSelectedUsers([]);
      setQuery("");
      await fetchCollaborators();
      setTab("list");
    } catch (err) {
      toast.error("Failed to share.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (username: string) => {
    try {
      await removeCollaborator(chatId, username);
      toast.success(`Removed ${username}`);
      await fetchCollaborators();
    } catch {
      toast.error("Failed to remove collaborator.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-lg p-6 rounded-lg shadow-lg relative">
        <button
          className="absolute top-3 right-4 text-gray-500 hover:text-black"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-4">
          Collaborators for “{chatTitle}”
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-1 rounded ${
              tab === "list"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-black"
            }`}
            onClick={() => setTab("list")}
          >
            Collaborators
          </button>
          <button
            className={`px-4 py-1 rounded ${
              tab === "add"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-black"
            }`}
            onClick={() => setTab("add")}
          >
            Add
          </button>
        </div>

        {tab === "list" ? (
          <div className="space-y-2 max-h-52 overflow-y-auto p-2">
            {collaborators.length === 0 ? (
              <p className="text-gray-500">You don’t have collaborators yet.</p>
            ) : (
              collaborators.map((c) => (
                <div key={c.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{c.collaborator.username}</p>
                    <p className="text-sm text-gray-500">
                      {c.access_level} {c.is_owner ? "(Owner)" : ""}
                      {!c.is_owner && !c.is_approved && " • Pending"}
                    </p>
                  </div>
                  {isOwner && !c.is_owner && (
                    <button
                      onClick={() => handleRemove(c.collaborator.username)}
                      className="text-red-500 hover:underline text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {!isOwner && (
              <div className="text-sm text-gray-600 border rounded p-2 bg-gray-50">
                Only the owner can add or remove collaborators.
              </div>
            )}

            <input
              type="text"
              placeholder="Search by username..."
              className="w-full px-3 py-2 border rounded"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!isOwner}
            />

            {users.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-auto p-1">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      disabled={!isOwner}
                    />
                    {user.username}
                  </label>
                ))}
              </div>
            )}

            <input
              type="email"
              placeholder="Or enter email to share"
              className="w-full px-3 py-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isOwner}
            />

            <div className="flex items-center gap-4">
              <label>Access:</label>
              <select
                value={accessLevel}
                onChange={(e) =>
                  setAccessLevel(e.target.value as "view" | "edit")
                }
                className="border rounded px-2 py-1"
                disabled={!isOwner}
              >
                <option value="view">View</option>
                <option value="edit">Edit</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6 gap-2">
          {tab === "add" && isOwner && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {loading ? "Sharing..." : "Share"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorModal;
