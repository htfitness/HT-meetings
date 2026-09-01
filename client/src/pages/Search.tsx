import { useState } from "react";
import { Link } from "wouter";
import { api, type SearchResults } from "../api";
import { useActiveGroup } from "../components/Layout";

export default function SearchPage() {
  const { activeGroup } = useActiveGroup();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [busy, setBusy] = useState(false);

  if (!activeGroup) return <p className="text-ht-gray">Select a group first.</p>;

  async function search() {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const r = await api.get<SearchResults>(
        `/groups/${activeGroup!.id}/search?q=${encodeURIComponent(query.trim())}`,
      );
      setResults(r);
    } finally {
      setBusy(false);
    }
  }

  const total = results
    ? results.meetings.length +
      results.notes.length +
      results.decisions.length +
      results.actionItems.length +
      results.transcripts.length
    : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-xl font-bold">Search — {activeGroup.name}</h2>
        <p className="mb-4 text-sm text-ht-gray">
          Search meeting titles, notes, decisions, action items, and
          transcripts.
        </p>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="flex-1 rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal"
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
          />
          <button
            onClick={search}
            disabled={busy}
            className="rounded-lg bg-ht-teal px-4 py-2.5 font-semibold text-white hover:bg-ht-teal-dark disabled:opacity-60"
          >
            {busy ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {results && (
        <div className="space-y-4">
          <p className="text-sm text-ht-gray">
            {total} result{total === 1 ? "" : "s"} for "{query}"
          </p>

          {results.meetings.length > 0 && (
            <Section title="Meetings">
              {results.meetings.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/meetings/${m.id}`}
                    className="block rounded-lg px-2 py-1.5 hover:bg-ht-light"
                  >
                    <span className="font-medium">{m.title}</span>
                    <span className="ml-2 text-xs text-ht-gray">
                      {m.meetingDate}
                    </span>
                  </Link>
                </li>
              ))}
            </Section>
          )}

          {results.notes.length > 0 && (
            <Section title="Notes">
              {results.notes.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/meetings/${n.meetingId}`}
                    className="block rounded-lg px-2 py-1.5 hover:bg-ht-light"
                  >
                    <span className="line-clamp-2">{n.content}</span>
                    <span className="text-xs text-ht-gray">
                      {n.authorName} · {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </Section>
          )}

          {results.decisions.length > 0 && (
            <Section title="Decisions">
              {results.decisions.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/meetings/${d.meetingId}`}
                    className="block rounded-lg px-2 py-1.5 hover:bg-ht-light"
                  >
                    <span className="line-clamp-2">{d.content}</span>
                    <span className="text-xs text-ht-gray">{d.authorName}</span>
                  </Link>
                </li>
              ))}
            </Section>
          )}

          {results.actionItems.length > 0 && (
            <Section title="Action Items">
              {results.actionItems.map((a) => (
                <li key={a.id} className="rounded-lg px-2 py-1.5">
                  <span>{a.title}</span>
                  <span className="ml-2 text-xs text-ht-gray">
                    {a.ownerName ?? "Unassigned"}
                    {a.dueDate ? ` · due ${a.dueDate}` : ""} · {a.status}
                  </span>
                </li>
              ))}
            </Section>
          )}

          {results.transcripts.length > 0 && (
            <Section title="Transcripts">
              {results.transcripts.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/meetings/${t.meetingId}`}
                    className="block rounded-lg px-2 py-1.5 hover:bg-ht-light"
                  >
                    <span className="font-medium">{t.fileName}</span>
                    <span className="ml-2 text-xs text-ht-gray">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </Section>
          )}

          {total === 0 && (
            <p className="rounded-xl bg-white p-5 text-sm text-ht-gray shadow-sm">
              No matches found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ul className="space-y-1 text-sm">{children}</ul>
    </div>
  );
}
