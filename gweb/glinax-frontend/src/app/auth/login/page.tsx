"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    setError(null);
    try {
      const res = await api.post("/auth/login/", { username, password });
      const { access, refresh } = res.data;
      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);
      localStorage.setItem("username", res.data.user.username); // or whatever field it is

      router.push("/"); // redirect after login
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Invalid credentials.";
      setError(msg);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Login</h2>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full border p-2 mb-4"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border p-2 mb-4"
      />
      <button
        onClick={handleLogin}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        Login
      </button>

      <p className="text-sm text-gray-600 mt-4">
        Don’t have an account?{" "}
        <a href="/auth/register" className="text-blue-600 underline">
          Register here
        </a>
      </p>
    </div>
  );
}
