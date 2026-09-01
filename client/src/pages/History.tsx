import { useEffect, useState } from "react";
import { Link } from "wouter";
import { api, type MeetingSummary } from "../api";
import { useActiveGroup } from "../components/Layout";

export default function HistoryPage() {
  const { activeGroup } = useActiveGroup();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeGroup) return;
    setLoading(true);
    api
      .get<MeetingSummary[]>(`/groups/${activeGroup.id}/meetings`)
      .then(setMeetings)
      .finally(() => setLoading(false));
  }, [activeGroup]);

  if (!activeGroup) return <p className="text-ht-gray">Select a group first.</p>;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ht-teal border-t-transparent" />
      </div>
    );
  }

  const statusStyle: Record<string, string> = {
    scheduled: "bg-black/10 text-ht-gray",
    in_progress: "bg-ht-teal/15 text-ht-teal-dark",
    completed: "bg-ht-orange/15 text-ht-orange-dark",
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">
        Meeting History — {activeGroup.name}
      </h2>
      {meetings.length === 0 ? (
        <p className="text-sm text-ht-gray">
          No meetings yet. Create your first agenda to get started.
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {meetings.map((m) => (
            <li key={m.id}>
              <Link
                href={`/meetings/${m.id}`}
                className="flex items-center justify-between gap-3 px-2 py-3 hover:bg-ht-light"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.title}</p>
                  <p className="text-xs text-ht-gray">{m.meetingDate}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[m.status]}`}
                >
                  {m.status.replace("_", " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
