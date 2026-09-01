import { useEffect, useState } from "react";
import {
  api,
  type GroupInfo,
  type MemberEntry,
  type SafeUser,
} from "../api";
import { useAuth } from "../auth";

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "user" | "admin",
  });
  const [newGroupName, setNewGroupName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [u, g] = await Promise.all([
      api.get<SafeUser[]>("/users"),
      api.get<GroupInfo[]>("/groups"),
    ]);
    setUsers(u);
    setGroups(g);
    if (g.length > 0 && !selectedGroup) setSelectedGroup(g[0].id);
  }

  async function loadMembers(groupId: number) {
    const m = await api.get<MemberEntry[]>(`/groups/${groupId}/members`);
    setMembers(m);
  }

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user]);

  useEffect(() => {
    if (selectedGroup) loadMembers(selectedGroup);
  }, [selectedGroup]);

  if (user?.role !== "admin") {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-ht-gray">Admin access required.</p>
      </div>
    );
  }

  async function inviteUser() {
    setError("");
    setMessage("");
    try {
      await api.post("/users", newUser);
      setMessage(`Invited ${newUser.name}. Share their email and temporary password with them.`);
      setNewUser({ name: "", email: "", password: "", role: "user" });
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to invite user");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Admin</h2>
        <p className="text-sm text-ht-gray">
          Manage users, groups, and memberships.
        </p>
      </div>

      {message && (
        <p className="rounded-lg bg-ht-teal/10 px-3 py-2 text-sm text-ht-teal-dark">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold">Invite a user</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            placeholder="Full name"
            className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ht-teal"
          />
          <input
            type="email"
            value={newUser.email}
            onChange={(e) =>
              setNewUser({ ...newUser, email: e.target.value })
            }
            placeholder="Email"
            className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ht-teal"
          />
          <input
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            placeholder="Temporary password (8+ chars)"
            className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ht-teal"
          />
          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser({
                ...newUser,
                role: e.target.value as "user" | "admin",
              })
            }
            className="rounded-lg border border-black/15 px-2 py-2 text-sm"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={inviteUser}
            disabled={
              !newUser.name || !newUser.email.includes("@") || newUser.password.length < 8
            }
            className="rounded-lg bg-ht-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ht-teal-dark disabled:opacity-50"
          >
            Invite
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold">Users ({users.length})</h3>
        <ul className="divide-y divide-black/5 text-sm">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="font-medium">{u.name}</span>
              <span className="text-ht-gray">{u.email}</span>
              {u.role === "admin" && (
                <span className="rounded bg-ht-black px-1.5 py-0.5 text-xs font-semibold text-white">
                  admin
                </span>
              )}
              {!u.active && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                  deactivated
                </span>
              )}
              <span className="ml-auto flex gap-2">
                <button
                  onClick={async () => {
                    const pw = prompt(
                      `New password for ${u.name} (min 8 characters):`,
                    );
                    if (pw && pw.length >= 8) {
                      await api.post(`/users/${u.id}/reset-password`, {
                        newPassword: pw,
                      });
                      setMessage(`Password reset for ${u.name}.`);
                    }
                  }}
                  className="text-xs font-medium text-ht-teal hover:underline"
                >
                  reset password
                </button>
                {u.id !== user.id && (
                  <button
                    onClick={async () => {
                      await api.post(`/users/${u.id}/active`, {
                        active: !u.active,
                      });
                      await load();
                    }}
                    className="text-xs font-medium text-ht-orange hover:underline"
                  >
                    {u.active ? "deactivate" : "reactivate"}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold">Groups</h3>
        <div className="mb-4 flex gap-2">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name…"
            className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ht-teal"
          />
          <button
            onClick={async () => {
              if (!newGroupName.trim()) return;
              await api.post("/groups", { name: newGroupName.trim() });
              setNewGroupName("");
              await load();
            }}
            className="rounded-lg bg-ht-teal px-4 py-2 text-sm font-semibold text-white"
          >
            Create group
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                selectedGroup === g.id
                  ? "bg-ht-teal text-white"
                  : "bg-ht-light text-ht-black hover:bg-black/10"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {selectedGroup && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              Members of {groups.find((g) => g.id === selectedGroup)?.name}
            </h4>
            <ul className="mb-3 space-y-1.5 text-sm">
              {members.map((m) => (
                <li
                  key={m.memberId}
                  className="flex items-center gap-2 rounded-lg bg-ht-light px-3 py-2"
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-ht-gray">{m.email}</span>
                  {m.memberRole === "group_admin" && (
                    <span className="rounded bg-ht-teal/15 px-1.5 py-0.5 text-xs font-semibold text-ht-teal-dark">
                      group admin
                    </span>
                  )}
                  <span className="ml-auto flex gap-2">
                    <button
                      onClick={async () => {
                        await api.post(`/groups/${selectedGroup}/members`, {
                          userId: m.userId,
                          role:
                            m.memberRole === "group_admin"
                              ? "member"
                              : "group_admin",
                        });
                        await loadMembers(selectedGroup);
                      }}
                      className="text-xs font-medium text-ht-teal hover:underline"
                    >
                      {m.memberRole === "group_admin"
                        ? "make member"
                        : "make group admin"}
                    </button>
                    <button
                      onClick={async () => {
                        await api.delete(
                          `/groups/${selectedGroup}/members/${m.userId}`,
                        );
                        await loadMembers(selectedGroup);
                      }}
                      className="text-xs font-medium text-ht-orange hover:underline"
                    >
                      remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <select
                id="add-member-select"
                className="flex-1 rounded-lg border border-black/15 px-2 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Add a user to this group…
                </option>
                {users
                  .filter(
                    (u) =>
                      u.active && !members.some((m) => m.userId === u.id),
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
              </select>
              <button
                onClick={async () => {
                  const select = document.getElementById(
                    "add-member-select",
                  ) as HTMLSelectElement;
                  const userId = Number(select.value);
                  if (!userId) return;
                  await api.post(`/groups/${selectedGroup}/members`, {
                    userId,
                    role: "member",
                  });
                  select.value = "";
                  await loadMembers(selectedGroup);
                }}
                className="rounded-lg bg-ht-black px-4 py-2 text-sm font-semibold text-white"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
