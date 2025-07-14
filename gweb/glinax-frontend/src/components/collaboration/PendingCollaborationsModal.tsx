'use client';

import { FC, useEffect, useState } from 'react';
import {
  getPendingCollaborations,
  approveCollaboration,
} from '@/lib/api/collaboration';
import { toast } from 'react-toastify';

type Props = {
  onClose: () => void;
  onChatApproved: () => void;
};

const PendingCollaborationsModal: FC<Props> = ({ onClose, onChatApproved }) => {
  const [pendingChats, setPendingChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = async () => {
    try {
      const res = await getPendingCollaborations();
      setPendingChats(res);
    } catch (err) {
      toast.error('Failed to load pending collaborations');
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (chatId: number) => {
    setLoading(true);
    try {
      await approveCollaboration(chatId);
      toast.success('Collaboration approved');
      setPendingChats((prev) => prev.filter((c) => c.id !== chatId));
      onChatApproved(); // Refresh sidebar
    } catch (err) {
      toast.error('Failed to approve collaboration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-md">
        <h2 className="text-lg font-semibold mb-4">Pending Invitations</h2>

        {pendingChats.length === 0 ? (
          <p className="text-gray-500">No pending collaborations.</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-auto">
            {pendingChats.map((chat) => (
              <li
                key={chat.id}
                className="border rounded p-3 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{chat.title || 'Untitled'}</p>
                  <p className="text-sm text-gray-500">
                    Shared by: {chat.owner?.username}
                  </p>
                </div>
                <button
                  onClick={() => handleApprove(chat.id)}
                  disabled={loading}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                >
                  Accept
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingCollaborationsModal;
