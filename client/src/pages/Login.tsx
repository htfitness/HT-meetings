import { useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function LoginPage() {
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/login", { username, password });
      await refresh();
    } catch (err: any) {
      setError(err.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ht-black px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/logo.jpg"
            alt="HT Fitness"
            className="mb-3 h-20 w-20 rounded-full border-4 border-ht-teal object-cover"
          />
          <h1 className="text-2xl font-bold text-ht-black">
            HT Fitness Meetings
          </h1>
          <p className="mt-1 text-sm text-ht-gray">
            Sign in to your meeting workspace
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ht-black">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal focus:ring-2 focus:ring-ht-teal/30"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ht-black">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal focus:ring-2 focus:ring-ht-teal/30"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-ht-orange py-2.5 font-semibold text-white transition-colors hover:bg-ht-orange-dark disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
