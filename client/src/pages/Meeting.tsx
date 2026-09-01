import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import {
  api,
  type MeetingDetail,
  type MemberEntry,
} from "../api";
import { useActiveGroup } from "../components/Layout";

export default function MeetingPage() {
  const params = useParams<{ id: string }>();
  const meetingId = Number(params.id);
  const { activeGroup } = useActiveGroup();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState<Record<number, string>>({});
  const [newItemText, setNewItemText] = useState<Record<number, string>>({});
  const [openTranscript, setOpenTranscript] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const detail = await api.get<MeetingDetail>(`/meetings/${meetingId}`);
    setMeeting(detail);
    setLoading(false);
  }, [meetingId]);

  useEffect(() => {
    setLoading(true);
    load().catch(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (meeting?.groupId) {
      api
        .get<MemberEntry[]>(`/groups/${meeting.groupId}/members`)
        .then(setMembers)
        .catch(() => {});
    }
  }, [meeting?.groupId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ht-teal border-t-transparent" />
      </div>
    );
  }

  if (!meeting) {
    return <p className="text-ht-gray">Meeting not found.</p>;
  }

  const editable = meeting.status !== "completed";

  async function uploadTranscript(file: File) {
    setUploadError("");
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Transcript is too large (max 2 MB of plain text).");
      return;
    }
    const content = await file.text();
    await api.post(`/meetings/${meetingId}/transcripts`, {
      fileName: file.name,
      content,
    });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm print-full">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{meeting.title}</h2>
            <p className="text-sm text-ht-gray">
              {meeting.meetingDate} · {activeGroup?.name ?? ""} ·{" "}
              <span className="font-medium capitalize">
                {meeting.status.replace("_", " ")}
              </span>
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-ht-light no-print"
          >
            Print / Export PDF
          </button>
        </div>
      </div>

      {meeting.sections.map((section, idx) => {
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
          <div key={section.id} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ht-black text-xs font-bold text-white">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold leading-tight">
                  {section.title}
                </h3>
                <p className="text-xs capitalize text-ht-gray">
                  {section.status} · planned {section.plannedMinutes} min
                </p>
              </div>
            </div>

            {section.purpose && (
              <p className="mb-3 rounded-lg bg-ht-light p-3 text-sm italic text-ht-gray">
                {section.purpose}
              </p>
            )}

            <ul className="mb-3 space-y-1.5 text-sm">
              {section.items.map((item) => (
                <li key={item.id} className="group flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ht-teal" />
                  <span className="flex-1">
                    {item.content}
                    {item.carriedOver && (
                      <span className="ml-2 rounded bg-ht-orange/10 px-1.5 py-0.5 text-xs font-medium text-ht-orange-dark">
                        carried over
                      </span>
                    )}
                  </span>
                  {editable && (
                    <button
                      onClick={async () => {
                        await api.delete(`/items/${item.id}`);
                        await load();
                      }}
                      className="text-xs text-ht-gray opacity-0 hover:text-red-600 group-hover:opacity-100 no-print"
                    >
                      remove
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {editable && (
              <div className="mb-3 flex gap-2 no-print">
                <input
                  value={newItemText[section.id] ?? ""}
                  onChange={(e) =>
                    setNewItemText({
                      ...newItemText,
                      [section.id]: e.target.value,
                    })
                  }
                  placeholder="Add a talking point…"
                  className="flex-1 rounded-lg border border-black/15 px-3 py-1.5 text-sm outline-none focus:border-ht-teal"
                  onKeyDown={async (e) => {
                    const val = (newItemText[section.id] ?? "").trim();
                    if (e.key === "Enter" && val) {
                      await api.post(`/sections/${section.id}/items`, {
                        content: val,
                      });
                      setNewItemText({ ...newItemText, [section.id]: "" });
                      await load();
                    }
                  }}
                />
              </div>
            )}

            {sectionNotes.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ht-gray">
                  Notes
                </p>
                <ul className="space-y-1.5 text-sm">
                  {sectionNotes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-ht-light px-3 py-2">
                      <p className="whitespace-pre-wrap">{n.content}</p>
                      <p className="mt-1 text-xs text-ht-gray">
                        {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {editable && (
              <div className="mb-3 flex gap-2 no-print">
                <input
                  value={noteText[section.id] ?? ""}
                  onChange={(e) =>
                    setNoteText({ ...noteText, [section.id]: e.target.value })
                  }
                  placeholder="Add a note to this section…"
                  className="flex-1 rounded-lg border border-black/15 px-3 py-1.5 text-sm outline-none focus:border-ht-teal"
                  onKeyDown={async (e) => {
                    const val = (noteText[section.id] ?? "").trim();
                    if (e.key === "Enter" && val) {
                      await api.post(`/meetings/${meetingId}/notes`, {
                        content: val,
                        sectionId: section.id,
                      });
                      setNoteText({ ...noteText, [section.id]: "" });
                      await load();
                    }
                  }}
                />
              </div>
            )}

            {sectionDecisions.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ht-gray">
                  Decisions
                </p>
                <ul className="space-y-1.5 text-sm">
                  {sectionDecisions.map((d) => (
                    <li
                      key={d.id}
                      className="rounded-lg border-l-4 border-ht-teal bg-ht-light px-3 py-2"
                    >
                      {d.content}
                      <span className="ml-2 text-xs text-ht-gray">
                        — {d.authorName}
                      </span>
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
                        className="h-4 w-4 accent-ht-teal no-print"
                      />
                      <span
                        className={
                          a.status === "done" ? "text-ht-gray line-through" : ""
                        }
                      >
                        {a.title}
                      </span>
                      <span className="ml-auto text-xs text-ht-gray">
                        {a.ownerName ?? "Unassigned"}
                        {a.dueDate ? ` · due ${a.dueDate}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      {/* General notes */}
      {meeting.notes.filter((n) => n.sectionId === null).length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold">General notes</h3>
          <ul className="space-y-1.5 text-sm">
            {meeting.notes
              .filter((n) => n.sectionId === null)
              .map((n) => (
                <li key={n.id} className="rounded-lg bg-ht-light px-3 py-2">
                  <p className="whitespace-pre-wrap">{n.content}</p>
                  <p className="mt-1 text-xs text-ht-gray">
                    {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Transcripts */}
      <div className="rounded-xl bg-white p-5 shadow-sm no-print">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">
            Plaud transcripts ({meeting.transcripts.length})
          </h3>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadTranscript(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-ht-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ht-teal-dark"
            >
              Upload transcript (.txt)
            </button>
          </div>
        </div>
        {uploadError && (
          <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {uploadError}
          </p>
        )}
        {meeting.transcripts.length === 0 ? (
          <p className="text-sm text-ht-gray">
            Export the plain-text transcript from your Plaud app and upload it
            here so the whole team can read it with this meeting.
          </p>
        ) : (
          <ul className="space-y-2">
            {meeting.transcripts.map((t) => (
              <li key={t.id} className="rounded-lg border border-black/10">
                <button
                  onClick={() =>
                    setOpenTranscript(openTranscript === t.id ? null : t.id)
                  }
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ht-light"
                >
                  <span className="font-medium">{t.fileName}</span>
                  <span className="text-xs text-ht-gray">
                    {t.uploaderName} · {new Date(t.createdAt).toLocaleString()}{" "}
                    {openTranscript === t.id ? "▲" : "▼"}
                  </span>
                </button>
                {openTranscript === t.id && (
                  <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap border-t border-black/10 bg-ht-light p-3 text-xs">
                    {t.content}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {members.length > 0 && (
        <p className="hidden text-xs text-ht-gray print:block">
          Attendees: {members.map((m) => m.name).join(", ")}
        </p>
      )}
    </div>
  );
}
