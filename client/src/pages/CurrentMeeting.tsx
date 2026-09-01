import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  api,
  type ActionItemEntry,
  type MeetingDetail,
  type MeetingSection,
  type MeetingSummary,
  type MemberEntry,
} from "../api";
import { useActiveGroup } from "../components/Layout";

function formatClock(totalSeconds: number) {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

function sectionElapsed(section: MeetingSection, now: number) {
  let elapsed = section.elapsedSeconds;
  if (section.timerStartedAt) {
    elapsed += Math.floor(
      (now - new Date(section.timerStartedAt).getTime()) / 1000,
    );
  }
  return elapsed;
}

export default function CurrentMeetingPage() {
  const { activeGroup } = useActiveGroup();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [noteText, setNoteText] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [actionText, setActionText] = useState("");
  const [actionOwner, setActionOwner] = useState<number | "">("");
  const [actionDue, setActionDue] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!activeGroup) return;
    const summaries = await api.get<MeetingSummary[]>(
      `/groups/${activeGroup.id}/meetings`,
    );
    const current =
      summaries.find((m) => m.status === "in_progress") ??
      summaries
        .filter((m) => m.status === "scheduled")
        .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate))[0];
    if (!current) {
      setMeeting(null);
      setLoading(false);
      return;
    }
    const detail = await api.get<MeetingDetail>(`/meetings/${current.id}`);
    setMeeting(detail);
    setLoading(false);
  }, [activeGroup]);

  useEffect(() => {
    if (!activeGroup) return;
    setLoading(true);
    load();
    api
      .get<MemberEntry[]>(`/groups/${activeGroup.id}/members`)
      .then(setMembers);
  }, [activeGroup, load]);

  // Live clock + polling while a meeting is in progress.
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (meeting?.status === "in_progress") {
      pollRef.current = setInterval(load, 5000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [meeting?.status, load]);

  if (!activeGroup) {
    return <p className="text-ht-gray">Select a group first.</p>;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ht-teal border-t-transparent" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">No meeting scheduled</h2>
        <p className="mb-4 text-ht-gray">
          Create the next meeting agenda for {activeGroup.name} first.
        </p>
        <Link
          href="/next-agenda"
          className="inline-block rounded-lg bg-ht-teal px-4 py-2 font-semibold text-white hover:bg-ht-teal-dark"
        >
          Create Next Meeting Agenda
        </Link>
      </div>
    );
  }

  const currentSection = meeting.sections.find(
    (s) => s.id === meeting.currentSectionId,
  );
  const doneCount = meeting.sections.filter(
    (s) => s.status === "discussed" || s.status === "skipped",
  ).length;

  async function startMeeting() {
    await api.post(`/meetings/${meeting!.id}/start`);
    await load();
  }

  async function completeMeeting() {
    if (!confirm("Mark this meeting as completed?")) return;
    await api.post(`/meetings/${meeting!.id}/complete`);
    await load();
  }

  async function goToSection(sectionId: number) {
    await api.post(`/meetings/${meeting!.id}/current-section`, { sectionId });
    await load();
  }

  async function setSectionStatus(
    sectionId: number,
    status: MeetingSection["status"],
  ) {
    await api.post(`/sections/${sectionId}/status`, { status });
    await load();
  }

  async function addNote(sectionId?: number) {
    if (!noteText.trim()) return;
    await api.post(`/meetings/${meeting!.id}/notes`, {
      content: noteText.trim(),
      sectionId,
    });
    setNoteText("");
    await load();
  }

  async function addDecision(sectionId?: number) {
    if (!decisionText.trim()) return;
    await api.post(`/meetings/${meeting!.id}/decisions`, {
      content: decisionText.trim(),
      sectionId,
    });
    setDecisionText("");
    await load();
  }

  async function addAction(sectionId?: number) {
    if (!actionText.trim()) return;
    await api.post("/action-items", {
      groupId: activeGroup!.id,
      meetingId: meeting!.id,
      sectionId,
      title: actionText.trim(),
      ownerId: actionOwner === "" ? undefined : Number(actionOwner),
      dueDate: actionDue || undefined,
    });
    setActionText("");
    setActionOwner("");
    setActionDue("");
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{meeting.title}</h2>
            <p className="text-sm text-ht-gray">
              {meeting.meetingDate} ·{" "}
              {meeting.status === "in_progress"
                ? "In progress"
                : meeting.status === "completed"
                  ? "Completed"
                  : "Scheduled"}{" "}
              · {doneCount}/{meeting.sections.length} sections done
            </p>
          </div>
          <div className="flex gap-2">
            {meeting.status === "scheduled" && (
              <button
                onClick={startMeeting}
                className="rounded-lg bg-ht-teal px-4 py-2 font-semibold text-white hover:bg-ht-teal-dark"
              >
                Start meeting
              </button>
            )}
            {meeting.status === "in_progress" && (
              <button
                onClick={completeMeeting}
                className="rounded-lg bg-ht-orange px-4 py-2 font-semibold text-white hover:bg-ht-orange-dark"
              >
                Complete meeting
              </button>
            )}
            <Link
              href={`/meetings/${meeting.id}`}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-ht-light"
            >
              Full record
            </Link>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full bg-ht-teal transition-all"
            style={{
              width: `${meeting.sections.length ? (doneCount / meeting.sections.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {currentSection && meeting.status === "in_progress" && (
        <CurrentSectionBanner
          section={currentSection}
          now={now}
          onStatus={setSectionStatus}
          onNext={() => {
            const idx = meeting.sections.findIndex(
              (s) => s.id === currentSection.id,
            );
            const next = meeting.sections[idx + 1];
            if (next) goToSection(next.id);
          }}
          hasNext={
            meeting.sections.findIndex((s) => s.id === currentSection.id) <
            meeting.sections.length - 1
          }
        />
      )}

      <div className="space-y-4">
        {meeting.sections.map((section, idx) => {
          const isCurrent = section.id === meeting.currentSectionId;
          const elapsed = sectionElapsed(section, now);
          const planned = section.plannedMinutes * 60;
          const remaining = planned - elapsed;
          const sectionNotes = meeting.notes.filter(
            (n) => n.sectionId === section.id,
          );
          const sectionDecisions = meeting.decisions.filter(
            (d) => d.sectionId === section.id,
          );
          const sectionActions = meeting.actionItems.filter(
            (a) => a.sectionId === section.id,
          );

          return (
            <div
              key={section.id}
              className={`rounded-xl bg-white shadow-sm ${
                isCurrent ? "ring-2 ring-ht-teal" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-black/5 p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ht-black text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-tight">
                    {section.title}
                  </h3>
                  <p className="text-xs text-ht-gray">
                    Planned {section.plannedMinutes} min · Elapsed{" "}
                    {formatClock(elapsed)}
                    {remaining < 0 && (
                      <span className="ml-1 font-semibold text-ht-orange">
                        (over by {formatClock(-remaining)})
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={section.status} />
                {meeting.status === "in_progress" && !isCurrent && (
                  <button
                    onClick={() => goToSection(section.id)}
                    className="rounded-lg border border-ht-teal px-3 py-1.5 text-xs font-semibold text-ht-teal hover:bg-ht-teal hover:text-white"
                  >
                    Go here
                  </button>
                )}
              </div>

              <div className="space-y-4 p-4">
                {section.purpose && (
                  <p className="rounded-lg bg-ht-light p-3 text-sm italic text-ht-gray">
                    {section.purpose}
                  </p>
                )}

                {section.items.length > 0 && (
                  <ul className="space-y-1.5 text-sm">
                    {section.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ht-teal" />
                        <span>
                          {item.content}
                          {item.carriedOver && (
                            <span className="ml-2 rounded bg-ht-orange/10 px-1.5 py-0.5 text-xs font-medium text-ht-orange-dark">
                              carried over
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {meeting.status === "in_progress" && isCurrent && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSectionStatus(section.id, "discussed")}
                      className="rounded-lg bg-ht-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-ht-teal-dark"
                    >
                      Mark discussed
                    </button>
                    <button
                      onClick={() => setSectionStatus(section.id, "deferred")}
                      className="rounded-lg bg-ht-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-ht-orange-dark"
                    >
                      Defer to next week
                    </button>
                    <button
                      onClick={() => setSectionStatus(section.id, "skipped")}
                      className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold hover:bg-ht-light"
                    >
                      Skip
                    </button>
                  </div>
                )}

                {sectionNotes.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ht-gray">
                      Notes
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {sectionNotes.map((n) => (
                        <li
                          key={n.id}
                          className="rounded-lg bg-ht-light px-3 py-2"
                        >
                          <p className="whitespace-pre-wrap">{n.content}</p>
                          <p className="mt-1 text-xs text-ht-gray">
                            {n.authorName} ·{" "}
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sectionDecisions.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ht-gray">
                      Decisions
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {sectionDecisions.map((d) => (
                        <li
                          key={d.id}
                          className="rounded-lg border-l-4 border-ht-teal bg-ht-light px-3 py-2"
                        >
                          <p className="whitespace-pre-wrap">{d.content}</p>
                          <p className="mt-1 text-xs text-ht-gray">
                            {d.authorName}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sectionActions.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ht-gray">
                      Action items
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {sectionActions.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-2 rounded-lg bg-ht-light px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={a.status === "done"}
                            onChange={async (e) => {
                              await api.put(`/action-items/${a.id}`, {
                                status: e.target.checked ? "done" : "open",
                              });
                              await load();
                            }}
                            className="h-4 w-4 accent-ht-teal"
                          />
                          <span
                            className={
                              a.status === "done"
                                ? "text-ht-gray line-through"
                                : ""
                            }
                          >
                            {a.title}
                          </span>
                          <span className="ml-auto text-xs text-ht-gray">
                            {a.ownerName ?? "Unassigned"}
                            {a.dueDate ? ` · ${a.dueDate}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {meeting.status !== "completed" && (
                  <details className="rounded-lg border border-black/10">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ht-teal hover:bg-ht-light">
                      + Add note, decision, or action item here
                    </summary>
                    <div className="space-y-3 border-t border-black/10 p-3">
                      <div className="flex gap-2">
                        <input
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add a note…"
                          className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ht-teal"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addNote(section.id);
                          }}
                        />
                        <button
                          onClick={() => addNote(section.id)}
                          className="rounded-lg bg-ht-teal px-3 py-2 text-sm font-semibold text-white"
                        >
                          Note
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={decisionText}
                          onChange={(e) => setDecisionText(e.target.value)}
                          placeholder="Record a decision…"
                          className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ht-teal"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addDecision(section.id);
                          }}
                        />
                        <button
                          onClick={() => addDecision(section.id)}
                          className="rounded-lg bg-ht-black px-3 py-2 text-sm font-semibold text-white"
                        >
                          Decision
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <input
                          value={actionText}
                          onChange={(e) => setActionText(e.target.value)}
                          placeholder="Action item…"
                          className="min-w-40 flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ht-teal"
                        />
                        <select
                          value={actionOwner}
                          onChange={(e) =>
                            setActionOwner(
                              e.target.value === "" ? "" : Number(e.target.value),
                            )
                          }
                          className="rounded-lg border border-black/15 px-2 py-2 text-sm"
                        >
                          <option value="">Me</option>
                          {members.map((m) => (
                            <option key={m.userId} value={m.userId}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={actionDue}
                          onChange={(e) => setActionDue(e.target.value)}
                          className="rounded-lg border border-black/15 px-2 py-2 text-sm"
                        />
                        <button
                          onClick={() => addAction(section.id)}
                          className="rounded-lg bg-ht-orange px-3 py-2 text-sm font-semibold text-white"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MeetingSection["status"] }) {
  const styles: Record<string, string> = {
    pending: "bg-black/10 text-ht-gray",
    discussed: "bg-ht-teal/15 text-ht-teal-dark",
    deferred: "bg-ht-orange/15 text-ht-orange-dark",
    skipped: "bg-black/5 text-ht-gray",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function CurrentSectionBanner({
  section,
  now,
  onStatus,
  onNext,
  hasNext,
}: {
  section: MeetingSection;
  now: number;
  onStatus: (id: number, status: MeetingSection["status"]) => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  const elapsed = sectionElapsed(section, now);
  const remaining = section.plannedMinutes * 60 - elapsed;
  const over = remaining < 0;

  return (
    <div
      className={`rounded-xl p-5 text-white shadow-md ${
        over ? "bg-ht-orange" : "bg-ht-teal"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
            Now discussing
          </p>
          <h3 className="text-xl font-bold">{section.title}</h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-bold tabular-nums">
            {formatClock(remaining)}
          </p>
          <p className="text-xs opacity-80">
            {over ? "over time" : "remaining"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => onStatus(section.id, "discussed")}
          className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold hover:bg-white/30"
        >
          Mark discussed
        </button>
        {hasNext && (
          <button
            onClick={onNext}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-ht-black hover:bg-white/90"
          >
            Next section →
          </button>
        )}
      </div>
    </div>
  );
}
