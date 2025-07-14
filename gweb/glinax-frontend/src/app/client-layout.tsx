"use client";

import { useEffect, useState } from "react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername && storedUsername !== "undefined") {
      setUsername(storedUsername);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      {username && username !== "undefined" && (
        <div>
        </div>
      )}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
