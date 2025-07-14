"use client";

import { useState } from "react";
import BaseModal from "../ui/BaseModal";

interface Props {
  onClose: () => void;
}

export default function ConvertToAudioModal({ onClose }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [voice, setVoice] = useState("nova");
  const [speed, setSpeed] = useState(1.0);

  const voices = ["nova", "shimmer", "echo", "fable", "onyx"];

  const handleSubmit = async () => {
    if (!text && !file) return alert("Please paste text or upload a file.");

    const formData = new FormData();
    if (text) formData.append("text", text);
    if (file) formData.append("file", file);
    formData.append("voice", voice);
    formData.append("speed", speed.toString());

    try {
      const res = await fetch("http://127.0.0.1:8000/api/audio/generate/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access") || ""}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert");
      alert("Audio generated successfully!");
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVoicePreview = async () => {
    const previewText = "Hello, this is a preview of the voice.";
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: previewText,
        voice,
        speed,
      }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  };

  return (
    <BaseModal title="Convert to Audio" onClose={onClose}>
      <div className="space-y-4">
        <textarea
          placeholder="Paste your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border border-gray-300 rounded p-2"
          rows={4}
        />
        <div className="text-center text-sm text-gray-500">— or —</div>
        <input
          type="file"
          accept=".txt,.docx,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <div className="flex flex-col gap-2 mt-4">
          <label className="font-medium">Voice</label>
          <select
            className="border border-gray-300 rounded p-2"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
          >
            {voices.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <button
            className="text-sm underline text-blue-600 hover:text-blue-800"
            onClick={handleVoicePreview}
            type="button"
          >
            🔊 Preview Voice
          </button>
        </div>

        <div className="mt-4">
          <label className="font-medium">Speed</label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-center">{speed.toFixed(1)}x</div>
        </div>

        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white w-full mt-4 py-2 rounded hover:bg-blue-700"
        >
          Convert to Audio
        </button>
      </div>
    </BaseModal>
  );
}
