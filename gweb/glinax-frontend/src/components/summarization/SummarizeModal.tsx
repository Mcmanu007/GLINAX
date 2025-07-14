"use client";

import { useState } from "react";
import BaseModal from "../ui/BaseModal";
import api from "@/lib/api";

interface Props {
  onClose: () => void;
  onSummary: (text: string) => void;
}

export default function SummarizeModal({ onClose, onSummary }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"text" | "file">("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file) {
      setError("Please upload a file.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Step 1: Upload the file
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      const uploadRes = await api.post("/files/upload/", uploadForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const file_id = uploadRes.data.id;
      if (!file_id) {
        throw new Error("File upload failed.");
      }

      // Step 2: Summarize the uploaded file
      const summaryRes = await api.post("/summary/", {
        file_id,
        format,
      });

      const { summary, warning } = summaryRes.data;

      if (format === "text" && summary) {
        onSummary(summary); // Send to chat
      }

      // Optionally handle warning (e.g., show toast or notification)

      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal title="Summarize File" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Upload File</label>
          <input
            type="file"
            accept=".pdf,.docx,.pptx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as "text" | "file")}
            className="mt-1 block w-full border border-gray-300 rounded p-2"
          >
            <option value="text">Text (show in chat)</option>
            <option value="file">File (save in summary inventory)</option>
          </select>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {loading ? "Summarizing..." : "Summarize"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
