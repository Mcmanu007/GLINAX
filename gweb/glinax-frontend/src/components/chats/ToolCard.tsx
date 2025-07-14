"use client";

interface Props {
  title: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

export default function ToolCard({ title, icon, color, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-3 cursor-pointer shadow hover:scale-105 transition ${color}`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="text-sm font-semibold mt-1">{title}</div>
    </div>
  );
}
