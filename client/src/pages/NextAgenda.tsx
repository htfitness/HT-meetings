import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  api,
  type MeetingDetail,
  type TemplateSection,
  type TopicEntry,
} from "../api";
import { useActiveGroup } from "../components/Layout";

function nextWeekDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function NextAgendaPage() {
  const { activeGroup } = useActiveGroup();
  const [, navigate] = useLocation();
  const [template, setTemplate] = useState<TemplateSection[]>([]);
  const [topics, setTopics] = useState<TopicEntry[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(nextWeekDate());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeGroup) return;
    setTitle(`${activeGroup.name} — Weekly Meeting`);
    api
      .get<TemplateSection[]>(`/groups/${activeGroup.id}/template`)
      .then(setTemplate);
    api
      .get<TopicEntry[]>(`/groups/${activeGroup.id}/topics`)
      .then((all) => setTopics(all.filter((t) => t.status === "open")));
  }, [activeGroup]);

  if (!activeGroup) {
    return <p className="text-ht-gray">Select a group first.</p>;
  }

  const totalMinutes = template
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.defaultMinutes, 0);

  async function createMeeting() {
    setBusy(true);
    setError("");
    try {
      const meeting = await api.post<MeetingDetail>(
        `/groups/${activeGroup!.id}/meetings`,
        { title, meetingDate: date },
      );
      // Attach selected topics to the new meeting's first section as talking points.
      if (selectedTopics.size > 0 && meeting) {
        const firstSection = meeting.sections[0];
        for (const topicId of selectedTopics) {
          const topic = topics.find((t) => t.id === topicId);
          if (topic && firstSection) {
            await api.post(`/sections/${firstSection.id}/items`, {
              content: topic.content,
            });
            await api.put(`/topics/${topicId}`, {
              status: "added",
              meetingId: meeting.id,
            });
          }
        }
      }
      navigate(`/meetings/${meeting!.id}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to create meeting");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-xl font-bold">
          Next Meeting Agenda — {activeGroup.name}
        </h2>
        <p className="text-sm text-ht-gray">
          Create a meeting from the group template. You can edit every section
          after it's created.
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Meeting title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Meeting date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal"
            />
          </div>
        </div>
      </div>

      {topics.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold">
            Suggested from Next Meeting Topics ({topics.length})
          </h3>
          <p className="mb-3 text-sm text-ht-gray">
            Selected topics will be added to the agenda and marked as added.
          </p>
          <ul className="space-y-2">
            {topics.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTopics.has(t.id)}
                  onChange={(e) => {
                    const next = new Set(selectedTopics);
                    if (e.target.checked) next.add(t.id);
                    else next.delete(t.id);
                    setSelectedTopics(next);
                  }}
                  className="mt-1 h-4 w-4 accent-ht-teal"
                />
                <span>
                  {t.content}
                  <span className="ml-2 text-xs text-ht-gray">
                    — {t.authorName}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Agenda preview</h3>
          <span className="text-sm text-ht-gray">
            ~{totalMinutes} min planned
          </span>
        </div>
        <ol className="space-y-3">
          {template
            .filter((s) => s.active)
            .map((s, idx) => (
              <li key={s.id} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ht-black text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium leading-tight">
                    {s.title}
                    <span className="ml-2 text-xs font-normal text-ht-gray">
                      {s.defaultMinutes} min
                    </span>
                  </p>
                  {s.items.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-sm text-ht-gray">
                      {s.items.map((item) => (
                        <li key={item.id}>· {item.content}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
        </ol>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        onClick={createMeeting}
        disabled={busy || !title.trim() || !date}
        className="w-full rounded-xl bg-ht-orange py-3 text-lg font-bold text-white shadow-sm transition-colors hover:bg-ht-orange-dark disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create meeting agenda"}
      </button>
    </div>
  );
}
