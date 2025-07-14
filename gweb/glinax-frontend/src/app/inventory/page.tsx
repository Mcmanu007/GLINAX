"use client";

import { useEffect, useState } from "react";
import { ScrollText, Download, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import PageLoader from "@/components/ui/PageLoader";

// ✅ Extend jsPDF type
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface Question {
  id: number;
  question: string;
  type: string;
  options?: string[];
  answer: string;
  image_url?: string | null;
  created_at: string;
}

export default function InventoryPage() {
  const [entries, setEntries] = useState<Question[][]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await api.get("/questions/");
      const grouped: { [timestamp: string]: Question[] } = {};

      for (const q of res.data) {
        const time = q.created_at.split("T")[0]; // Group by date
        if (!grouped[time]) grouped[time] = [];
        grouped[time].push(q);
      }

      const sortedGroups = Object.entries(grouped)
        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
        .map(([, questions]) => questions);

      setEntries(sortedGroups);
    } catch (err) {
      console.error("❌ Failed to load questions:", err);
      toast.error("Failed to load questions.");
    } finally {
      setLoading(false);
    }
  };
useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 1000); // simulate
    return () => clearTimeout(timeout);
  }, []);

  if (loading) return <PageLoader />;

  const handleDownload = (questions: Question[], i: number) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Glinax Prime - Question Set ${i + 1}`, 14, 20);

    let y = 30;

    questions.forEach((q, index) => {
      doc.setFontSize(12);
      doc.setTextColor(0);
      const questionLines = doc.splitTextToSize(`Q${index + 1}: ${q.question}`, 180);
      doc.text(questionLines, 14, y);
      y += questionLines.length * 6;

      if (q.options && q.options.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Option"]],
          body: q.options.map((opt) => [opt]),
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 2 },
          margin: { left: 14, right: 14 },
        });

        const finalY = (doc as any).lastAutoTable?.finalY || y + 6;
        y = finalY + 4;
      }

      doc.setFontSize(11);
      doc.setTextColor(0, 102, 0);
      doc.text(`Answer: ${q.answer}`, 14, y);
      y += 10;
    });

    doc.save(`questions_${i + 1}.pdf`);
  };

  const handleOpen = (group: Question[]) => {
    localStorage.setItem(
      "questionViewer",
      JSON.stringify({
        questions: group,
        context: "", // update context if needed
        submitted: true,
      })
    );
    localStorage.setItem("viewerDone", "false");
    router.push("/");
  };

  const handleDeleteGroup = async (group: Question[], index: number) => {
    try {
      for (const q of group) {
        await api.delete(`/questions/${q.id}/delete/`);
      }
      toast.success("Deleted");
      const updated = [...entries];
      updated.splice(index, 1);
      setEntries(updated);
    } catch {
      toast.error("Failed to delete group");
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-12 p-4">
      {/* 🔙 Back to homepage */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push("/")} className="flex gap-2 items-center">
          <ArrowLeft size={18} /> Back to Home
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ScrollText size={28} /> Question Inventory
      </h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500">No saved questions yet.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((group, i) => (
            <div key={i} className="p-4 border rounded-lg shadow-sm">
              <div className="text-sm text-gray-600 mb-1">
                Submitted: {new Date(group[0].created_at).toLocaleString()}
              </div>
              <div className="text-lg font-semibold">
                {group.length} question{group.length > 1 ? "s" : ""}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => handleOpen(group)}>
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(group, i)}
                  className="flex items-center gap-1"
                >
                  <Download size={16} /> Download
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteGroup(group, i)}
                  className="flex items-center gap-1"
                >
                  <Trash2 size={16} /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
