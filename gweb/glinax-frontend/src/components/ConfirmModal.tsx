"use client";

import { FC } from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmModal: FC<ConfirmModalProps> = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center modal-backdrop z-50">
      <div className="bg-white p-6 w-full max-w-sm rounded-lg space-y-4 modal-container">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p>{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
export type { ConfirmModalProps };