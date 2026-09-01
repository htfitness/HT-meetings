import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  api,
  type ActionItemEntry,
  type MeetingSummary,
  type TopicEntry,
} from "../api";
import { useActiveGroup } from "../components/Layout";

export default function DashboardPage() {
  const { activeGroup } = useActiveGroup();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [myItems, setMyItems] = useState<ActionItemEntry[]>([]);
  const [reminders, setReminders] = useState<ActionItemEntry[]>([]);
  const [topics, setTopics] = useState<TopicEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeGroup) return;
    setLoading(true);
    Promise.all([
      api.get<MeetingSummary[]>(`/groups/${activeGroup.id}/meetings`),
      api.get<ActionItemEntry[]>("/action-items/mine"),
      api.get<ActionItemEntry[]>("/action-items/reminders"),
      api.get<TopicEntry[]>(`/groups/${activeGroup.id}/topics`),
    ])
      .then(([m, mine, rem, t]) => {
        setMeetings(m);
        setMyItems(mine);
        setReminders(rem);
        setTopics(t.filter((x) => x.status === "open"));
      })
      .finally(() => setLoading(false));
  }, [activeGroup]);

  if (!activeGroup) {
    return (
      <p className="text-ht-gray">
        You are not a member of any meeting group yet. Ask an admin to add you.
      </p>
    );
  }

  const inProgress = meetings.find((m) => m.status === "in_progress");
  const upcoming = meetings
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate))[0];
  const recent = meetings
    .filter((m) => m.status === "completed")
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ht-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reminders.length > 0 && (
        <div className="rounded-xl border-l-4 border-ht-orange bg-orange-50 p-4">
          <h2 className="mb-2 font-semibold text-ht-orange-dark">
            Due reminders ({reminders.length})
          </h2>
          <ul className="space-y-1 text-sm">
            {reminders.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-ht-orange" />
                <span className="font-medium">{r.title}</span>
                <span className="text-ht-gray">
                  — due {r.dueDate}
                  {r.groupName ? ` (${r.groupName})` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">
            {activeGroup.name} — Current Meeting
          </h2>
          {inProgress ? (
            <div>
              <p className="mb-1 font-medium text-ht-teal-dark">
                {inProgress.title}
              </p>
              <p className="mb-3 text-sm text-ht-gray">
                In progress — {inProgress.meetingDate}
              </p>
              <Link
                href="/current"
                className="inline-block rounded-lg bg-ht-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ht-teal-dark"
              >
                Rejoin meeting
              </Link>
            </div>
          ) : upcoming ? (
            <div>
              <p className="mb-1 font-medium">{upcoming.title}</p>
              <p className="mb-3 text-sm text-ht-gray">
                Scheduled for {upcoming.meetingDate}
              </p>
              <Link
                href="/current"
                className="inline-block rounded-lg bg-ht-orange px-4 py-2 text-sm font-semibold text-white hover:bg-ht-orange-dark"
              >
                Open Current Meeting
              </Link>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-ht-gray">
                No meeting scheduled. Create the next agenda to get started.
              </p>
              <Link
                href="/next-agenda"
                className="inline-block rounded-lg bg-ht-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ht-teal-dark"
              >
                Create Next Meeting Agenda
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">
            My Action Items ({myItems.length})
          </h2>
          {myItems.length === 0 ? (
            <p className="text-sm text-ht-gray">Nothing assigned to you. 🎉</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {myItems.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      item.dueDate &&
                      item.dueDate <= new Date().toISOString().slice(0, 10)
                        ? "bg-ht-orange"
                        : "bg-ht-teal"
                    }`}
                  />
                  <div>
                    <p className="font-medium leading-snug">{item.title}</p>
                    <p className="text-xs text-ht-gray">
                      {item.dueDate ? `Due ${item.dueDate}` : "No due date"}
                      {item.groupName ? ` · ${item.groupName}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {myItems.length > 5 && (
            <Link
              href="/action-items"
              className="mt-3 inline-block text-sm font-medium text-ht-teal hover:underline"
            >
              View all {myItems.length} →
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Next Meeting Topics ({topics.length})
            </h2>
            <Link
              href="/topics"
              className="text-sm font-medium text-ht-teal hover:underline"
            >
              Manage →
            </Link>
          </div>
          {topics.length === 0 ? (
            <p className="text-sm text-ht-gray">
              No topics queued. Add ideas during the week as they come up.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topics.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ht-teal" />
                  <div>
                    <p className="leading-snug">{t.content}</p>
                    <p className="text-xs text-ht-gray">
                      {t.authorName ?? "Unknown"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Meetings</h2>
            <Link
              href="/history"
              className="text-sm font-medium text-ht-teal hover:underline"
            >
              All history →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-ht-gray">No completed meetings yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/meetings/${m.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-ht-light"
                  >
                    <span className="font-medium">{m.title}</span>
                    <span className="text-xs text-ht-gray">{m.meetingDate}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
