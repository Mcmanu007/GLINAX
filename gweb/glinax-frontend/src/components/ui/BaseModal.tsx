"use client";

import React from "react";

interface BaseModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export default function BaseModal({ title, children, onClose }: BaseModalProps) {
  return (
    <div className="fixed inset-0 z-50  bg-opacity-10 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <button
          className="absolute top-2 right-3 text-gray-500 hover:text-red-500 text-xl"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
}
