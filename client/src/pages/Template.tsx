import { useEffect, useState } from "react";
import { api, type TemplateSection } from "../api";
import { useAuth } from "../auth";
import { useActiveGroup } from "../components/Layout";

export default function TemplatePage() {
  const { user } = useAuth();
  const { activeGroup } = useActiveGroup();
  const [template, setTemplate] = useState<TemplateSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [sectionDraft, setSectionDraft] = useState({
    title: "",
    purpose: "",
    defaultMinutes: 10,
  });
  const [newItemText, setNewItemText] = useState<Record<number, string>>({});

  const canEdit =
    user?.role === "admin" || activeGroup?.memberRole === "group_admin";

  async function load() {
    if (!activeGroup) return;
    const t = await api.get<TemplateSection[]>(
      `/groups/${activeGroup.id}/template`,
    );
    setTemplate(t);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load().catch(() => setLoading(false));
  }, [activeGroup]);

  if (!activeGroup) return <p className="text-ht-gray">Select a group first.</p>;

  if (!canEdit) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-ht-gray">
          Only group admins can edit the {activeGroup.name} agenda template.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ht-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-xl font-bold">
          Agenda Template — {activeGroup.name}
        </h2>
        <p className="text-sm text-ht-gray">
          This is the master agenda for {activeGroup.name}. Every new meeting
          starts from this template. Changes only affect future meetings.
        </p>
      </div>

      {template.map((section, idx) => (
        <div key={section.id} className="rounded-xl bg-white p-5 shadow-sm">
          {editingSection === section.id ? (
            <div className="space-y-3">
              <input
                value={sectionDraft.title}
                onChange={(e) =>
                  setSectionDraft({ ...sectionDraft, title: e.target.value })
                }
                className="w-full rounded-lg border border-black/15 px-3 py-2 font-semibold outline-none focus:border-ht-teal"
              />
              <textarea
                value={sectionDraft.purpose}
                onChange={(e) =>
                  setSectionDraft({ ...sectionDraft, purpose: e.target.value })
                }
                rows={3}
                placeholder="Purpose of this section…"
                className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ht-teal"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm">Minutes:</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={sectionDraft.defaultMinutes}
                  onChange={(e) =>
                    setSectionDraft({
                      ...sectionDraft,
                      defaultMinutes: Number(e.target.value),
                    })
                  }
                  className="w-20 rounded-lg border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-ht-teal"
                />
                <button
                  onClick={async () => {
                    await api.put(`/template/sections/${section.id}`, {
                      title: sectionDraft.title,
                      purpose: sectionDraft.purpose,
                      defaultMinutes: sectionDraft.defaultMinutes,
                    });
                    setEditingSection(null);
                    await load();
                  }}
                  className="ml-auto rounded-lg bg-ht-teal px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ht-black text-xs font-bold text-white">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold leading-tight">
                  {section.title}
                  <span className="ml-2 text-xs font-normal text-ht-gray">
                    {section.defaultMinutes} min
                  </span>
                </h3>
                {section.purpose && (
                  <p className="mt-1 text-sm italic text-ht-gray">
                    {section.purpose}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setEditingSection(section.id);
                  setSectionDraft({
                    title: section.title,
                    purpose: section.purpose ?? "",
                    defaultMinutes: section.defaultMinutes,
                  });
                }}
                className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-ht-light"
              >
                Edit
              </button>
            </div>
          )}

          <ul className="mt-3 space-y-1.5 pl-10 text-sm">
            {section.items.map((item) => (
              <li key={item.id} className="group flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ht-teal" />
                <span className="flex-1">{item.content}</span>
                <button
                  onClick={async () => {
                    await api.delete(`/template/items/${item.id}`);
                    await load();
                  }}
                  className="text-xs text-ht-gray opacity-0 hover:text-red-600 group-hover:opacity-100"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex gap-2 pl-10">
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
                  await api.post(`/template/sections/${section.id}/items`, {
                    content: val,
                  });
                  setNewItemText({ ...newItemText, [section.id]: "" });
                  await load();
                }
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
