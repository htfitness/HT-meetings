import { useEffect, useState } from "react";
import { api, type TopicEntry } from "../api";
import { useActiveGroup } from "../components/Layout";

export default function TopicsPage() {
  const { activeGroup } = useActiveGroup();
  const [topics, setTopics] = useState<TopicEntry[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!activeGroup) return;
    const all = await api.get<TopicEntry[]>(`/groups/${activeGroup.id}/topics`);
    setTopics(all);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [activeGroup]);

  if (!activeGroup) return <p className="text-ht-gray">Select a group first.</p>;

  const open = topics.filter((t) => t.status === "open");
  const closed = topics.filter((t) => t.status !== "open");

  async function addTopic() {
    if (!newTopic.trim()) return;
    await api.post(`/groups/${activeGroup!.id}/topics`, {
      content: newTopic.trim(),
    });
    setNewTopic("");
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-xl font-bold">Next Meeting Topics</h2>
        <p className="mb-4 text-sm text-ht-gray">
          Something come up during the week? Add it here and it will be
          suggested when you build the next agenda for {activeGroup.name}.
        </p>
        <div className="flex gap-2">
          <input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="e.g. Talk about the new front-desk schedule…"
            className="flex-1 rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-ht-teal"
            onKeyDown={(e) => {
              if (e.key === "Enter") addTopic();
            }}
          />
          <button
            onClick={addTopic}
            className="rounded-lg bg-ht-teal px-4 py-2.5 font-semibold text-white hover:bg-ht-teal-dark"
          >
            Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ht-teal border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold">Open topics ({open.length})</h3>
            {open.length === 0 ? (
              <p className="text-sm text-ht-gray">Nothing queued right now.</p>
            ) : (
              <ul className="space-y-2">
                {open.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start justify-between gap-3 rounded-lg bg-ht-light px-3 py-2 text-sm"
                  >
                    <div>
                      <p>{t.content}</p>
                      <p className="text-xs text-ht-gray">
                        {t.authorName} ·{" "}
                        {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={async () => {
                          await api.put(`/topics/${t.id}`, {
                            status: "declined",
                          });
                          await load();
                        }}
                        className="text-xs font-medium text-ht-gray hover:text-ht-orange"
                      >
                        dismiss
                      </button>
                      <button
                        onClick={async () => {
                          await api.delete(`/topics/${t.id}`);
                          await load();
                        }}
                        className="text-xs font-medium text-ht-gray hover:text-red-600"
                      >
                        delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {closed.length > 0 && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-ht-gray">
                Previously handled ({closed.length})
              </h3>
              <ul className="space-y-1.5 text-sm text-ht-gray">
                {closed.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        t.status === "added"
                          ? "bg-ht-teal/15 text-ht-teal-dark"
                          : "bg-black/10"
                      }`}
                    >
                      {t.status}
                    </span>
                    <span>{t.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
