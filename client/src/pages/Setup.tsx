import { useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function SetupPage() {
  const { refresh } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/setup", { firstName, lastName, email, password });
      await refresh();
    } catch (err: any) {
      setError(err.message ?? "Setup failed");
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
          <h1 className="text-2xl font-bold text-ht-black">Welcome</h1>
          <p className="mt-1 text-center text-sm text-ht-gray">
            Create the first administrator account to get started. You can
            invite Lisa, Jason, Amanda, and the rest of the team afterwards.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal focus:ring-2 focus:ring-ht-teal/30"
              autoComplete="given-name"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal focus:ring-2 focus:ring-ht-teal/30"
              autoComplete="family-name"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal focus:ring-2 focus:ring-ht-teal/30"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Password (min 8 characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal focus:ring-2 focus:ring-ht-teal/30"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal focus:ring-2 focus:ring-ht-teal/30"
              autoComplete="new-password"
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
            className="w-full rounded-lg bg-ht-teal py-2.5 font-semibold text-white transition-colors hover:bg-ht-teal-dark disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create admin account"}
          </button>
        </form>
      </div>
    </div>
  );
}
