"use client";

import { FC, useState } from "react";
import api from "@/lib/api";

type RenameModalProps = {
  open: boolean;
  onClose: () => void;
  chatId: number | null;
  onSaved: () => void;
};

const RenameModal: FC<RenameModalProps> = ({ open, onClose, chatId, onSaved }) => {
  const [title, setTitle] = useState("");

  const handleSave = async () => {
    if (!chatId || !title.trim()) return;
    try {
      await api.post(`/chat/${chatId}/update/`, { title });
      onSaved();
      onClose();
      setTitle("");
    } catch {
      alert("Rename failed");
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center modal-backdrop z-50">
      <div className="bg-white p-6 w-full max-w-md rounded-lg space-y-4 modal-container ">
        <h2 className="text-xl font-semibold">Rename Chat</h2>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New chat title"
          className="w-full p-2 border rounded"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
};

export default RenameModal;
