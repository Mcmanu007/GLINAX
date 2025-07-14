"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleRegister = async () => {
    try {
      await api.post("/auth/register/", { username, email, password });
      alert("Registration successful. Now login.");
      router.push("/auth/login");
    } catch (err) {
      alert("Registration failed.");
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full border p-2 mb-4"
      />
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
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
        onClick={handleRegister}
        className="w-full bg-green-600 text-white py-2 rounded"
      >
        Register
      </button>
    </div>
  );
}
