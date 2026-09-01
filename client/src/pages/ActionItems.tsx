import { useEffect, useState } from "react";
import {
  api,
  type ActionItemEntry,
  type GroupInfo,
  type MemberEntry,
} from "../api";
import { useAuth } from "../auth";
import { useActiveGroup } from "../components/Layout";

export default function ActionItemsPage() {
  const { user } = useAuth();
  const { activeGroup, groups } = useActiveGroup();
  const [mine, setMine] = useState<ActionItemEntry[]>([]);
  const [groupItems, setGroupItems] = useState<ActionItemEntry[]>([]);
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState<number | "">("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!activeGroup) return;
    const [myAll, groupAll, mem] = await Promise.all([
      api.get<ActionItemEntry[]>("/action-items/mine"),
      api.get<ActionItemEntry[]>(`/groups/${activeGroup.id}/action-items`),
      api.get<MemberEntry[]>(`/groups/${activeGroup.id}/members`),
    ]);
    setMine(myAll);
    setGroupItems(groupAll);
    setMembers(mem);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load().catch(() => setLoading(false));
  }, [activeGroup]);

  if (!activeGroup) return <p className="text-ht-gray">Select a group first.</p>;

  const today = new Date().toISOString().slice(0, 10);

  async function addItem() {
    if (!title.trim()) return;
    await api.post("/action-items", {
      groupId: activeGroup!.id,
      title: title.trim(),
      ownerId: ownerId === "" ? undefined : Number(ownerId),
      dueDate: dueDate || undefined,
    });
    setTitle("");
    setOwnerId("");
    setDueDate("");
    await load();
  }

  function ItemRow({ item }: { item: ActionItemEntry }) {
    const overdue =
      item.status === "open" && item.dueDate && item.dueDate < today;
    return (
      <li className="flex items-center gap-3 rounded-lg bg-ht-light px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={item.status === "done"}
          onChange={async (e) => {
            await api.put(`/action-items/${item.id}`, {
              status: e.target.checked ? "done" : "open",
            });
            await load();
          }}
          className="h-4 w-4 accent-ht-teal"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`font-medium leading-snug ${
              item.status === "done" ? "text-ht-gray line-through" : ""
            }`}
          >
            {item.title}
          </p>
          <p className="text-xs text-ht-gray">
            {item.ownerName ?? "Unassigned"}
            {item.dueDate ? ` · due ${item.dueDate}` : ""}
            {item.groupName ? ` · ${item.groupName}` : ""}
            {overdue && (
              <span className="ml-1 font-semibold text-ht-orange">overdue</span>
            )}
          </p>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-xl font-bold">My Action Items</h2>
        <p className="text-sm text-ht-gray">
          Everything assigned to you across all groups, plus this group's full
          list.
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold">
          Add an action item — {activeGroup.name}
        </h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to get done?"
            className="min-w-48 flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ht-teal"
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
          />
          <select
            value={ownerId}
            onChange={(e) =>
              setOwnerId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="rounded-lg border border-black/15 px-2 py-2 text-sm"
          >
            <option value="">Assign to me</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-black/15 px-2 py-2 text-sm"
          />
          <button
            onClick={addItem}
            className="rounded-lg bg-ht-orange px-4 py-2 text-sm font-semibold text-white hover:bg-ht-orange-dark"
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
            <h3 className="mb-3 font-semibold">
              Assigned to me — all groups ({mine.length})
            </h3>
            {mine.length === 0 ? (
              <p className="text-sm text-ht-gray">You're all caught up. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {mine.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold">
              {activeGroup.name} — all action items ({groupItems.length})
            </h3>
            {groupItems.length === 0 ? (
              <p className="text-sm text-ht-gray">
                No action items in this group yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {groupItems.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
