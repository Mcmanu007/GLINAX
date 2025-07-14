
"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { getUsers, shareWithUsers } from "@/lib/api/collaboration";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";

interface AddCollaboratorsModalProps {
  chatId: number;
  isOwner: boolean;
  onClose: () => void;
  onAdded?: () => void; // Optional callback
}

export default function AddCollaboratorsModal({
  chatId,
  isOwner,
  onClose,
  onAdded,
}: AddCollaboratorsModalProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [accessLevel, setAccessLevel] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    try {
      const results = await getUsers(query);
      setSearchResults(results);
    } catch {
      toast.error("Search failed.");
    }
  };

  const toggleUser = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedUsers((prev) => [...prev, userId]);
    }
  };

  const handleSubmit = async () => {
    if (!isOwner) {
      toast.error("Only chat owners can add collaborators.");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Select at least one user.");
      return;
    }

    setLoading(true);
    try {
      await shareWithUsers(chatId, selectedUsers, accessLevel);
      toast.success("Collaborators added!");
      onClose();
      onAdded?.();
    } catch {
      toast.error("Failed to add collaborators.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} className="fixed inset-0 z-[9999]">
      <div className="flex items-center justify-center min-h-screen bg-black/50 p-4">
        <Dialog.Panel className="w-full max-w-lg bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Add Collaborators
            </Dialog.Title>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
            </button>
          </div>

          {!isOwner && (
            <p className="text-red-600 text-sm mb-3">
              You do not have permission to add collaborators.
            </p>
          )}

          <div className="space-y-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username..."
              className="w-full border px-3 py-2 rounded"
            />
            <button
              onClick={handleSearch}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Search
            </button>

            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {searchResults.length === 0 && <p className="text-sm text-gray-500">No users found.</p>}
              {searchResults.map((user) => (
                <label key={user.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                  />
                  <span>{user.username}</span>
                </label>
              ))}
            </div>

            <div className="flex space-x-4 items-center">
              <span className="text-sm font-medium">Access:</span>
              <label className="flex items-center space-x-1">
                <input
                  type="radio"
                  name="access"
                  value="view"
                  checked={accessLevel === "view"}
                  onChange={() => setAccessLevel("view")}
                />
                <span className="text-sm">View</span>
              </label>
              <label className="flex items-center space-x-1">
                <input
                  type="radio"
                  name="access"
                  value="edit"
                  checked={accessLevel === "edit"}
                  onChange={() => setAccessLevel("edit")}
                />
                <span className="text-sm">Edit</span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading || !isOwner}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
