"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, FileText, Mic, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

export default function FloatingActionMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="fixed bottom-6 right-13 z-50 flex flex-col items-end space-y-2">
      {open && (
        <>
          <Button
            className="rounded-full p-2 w-12 h-12 bg-blue-600  text-white"
            onClick={() => router.push("/inventory")}
            title="View Inventory"
          >
            <ScrollText size={20} />
          </Button>
          <Button
            className="rounded-full p-2 w-12 h-12 bg-blue-600  text-white"
            onClick={() => router.push("/inventory")}
            title="View Questions"
          >
            <ScrollText size={20} />
          </Button>
          {/* Future: Add other menu buttons here */}
        </>
      )}

      <Button
        className={clsx(
          "rounded-full p-4 w-14 h-14 shadow-lg transition-all",
          open ? "bg-red-500 text-white" : "bg-gray-800 text-white"
        )}
        onClick={() => setOpen((prev) => !prev)}
        title={open ? "Close Menu" : "Open Menu"}
      >
        {open ? <X size={24} /> : <Archive size={24} />}
      </Button>
    </div>
  );
}
