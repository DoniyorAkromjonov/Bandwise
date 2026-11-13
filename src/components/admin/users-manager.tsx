"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { adminUserSelect } from "@/lib/admin-users";

type User = Omit<Prisma.UserGetPayload<{ select: typeof adminUserSelect }>, "createdAt" | "lastActivityDate"> & {
  createdAt: string;
  lastActivityDate: string | null;
};

const inputClass = "min-h-10 rounded-lg border border-input bg-background px-3";

export function UsersManager() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ query: "", page: 1 });
  const [result, setResult] = useState<{ users: User[]; hasMore: boolean; adminId: string }>();
  const [selected, setSelected] = useState<User>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q: filter.query, page: String(filter.page) });
    void fetch(`/api/admin/users?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setMessage(error.message || "Could not load users.");
      });
    return () => controller.abort();
  }, [filter]);

  function load(query: string, page: number) {
    setSelected(undefined);
    setResult(undefined);
    setMessage("");
    setFilter({ query, page });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      const { id, name, email, role } = selected;
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSelected(data.user);
      setResult((current) => current && {
        ...current,
        users: current.users.map((user) => user.id === id ? data.user : user),
      });
      setMessage("User updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save user.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-border bg-card p-4">
        <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); load(search.trim(), 1); }}>
          <input className={`${inputClass} min-w-0 flex-1`} aria-label="Search users" placeholder="Name or email" value={search} disabled={busy} onChange={(event) => setSearch(event.target.value)} />
          <button className="rounded-lg border border-border px-3 text-sm font-semibold" disabled={busy}>Search</button>
        </form>
        <ul className="mt-3 divide-y divide-border">
          {result?.users.map((user) => (
            <li key={user.id}>
              <button type="button" disabled={busy} aria-pressed={selected?.id === user.id} onClick={() => { setSelected(user); setMessage(""); }} className="block w-full rounded-lg p-3 text-left hover:bg-secondary aria-pressed:bg-secondary">
                <span className="block break-all font-medium">{user.name} <span className="text-xs text-muted-foreground">· {user.role}</span></span>
                <span className="block break-all text-sm text-muted-foreground">{user.email}</span>
              </button>
            </li>
          ))}
        </ul>
        {!result && !message && <p className="mt-3 text-sm text-muted-foreground">Loading users…</p>}
        {result && !result.users.length && <p className="mt-3 text-sm text-muted-foreground">No users found.</p>}
        {result && (filter.page > 1 || result.hasMore) && (
          <div className="mt-4 flex items-center justify-between gap-2 text-sm">
            <button disabled={busy || filter.page === 1} onClick={() => load(filter.query, filter.page - 1)} className="disabled:opacity-40">Previous</button>
            <span>Page {filter.page}</span>
            <button disabled={busy || !result.hasMore} onClick={() => load(filter.query, filter.page + 1)} className="disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        {selected ? (
          <form onSubmit={save}>
            <fieldset disabled={busy} className="grid gap-3">
              <legend className="mb-3 font-semibold">Edit account</legend>
              <label className="grid gap-1 text-sm">Name<input required minLength={2} maxLength={80} className={inputClass} value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })} /></label>
              <label className="grid gap-1 text-sm">Email<input required type="email" maxLength={254} className={inputClass} value={selected.email} onChange={(event) => setSelected({ ...selected, email: event.target.value })} /></label>
              <label className="grid gap-1 text-sm">Role<select disabled={selected.id === result?.adminId} className={inputClass} value={selected.role} onChange={(event) => setSelected({ ...selected, role: event.target.value === "ADMIN" ? "ADMIN" : "USER" })}><option value="USER">User</option><option value="ADMIN">Administrator</option></select></label>
              <button className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">{busy ? "Saving…" : "Save changes"}</button>
            </fieldset>
            <dl className="mt-5 grid grid-cols-[1fr_auto] gap-2 border-t border-border pt-4 text-sm">
              <dt>Registered</dt><dd>{new Date(selected.createdAt).toLocaleDateString()}</dd>
              <dt>Last activity</dt><dd>{selected.lastActivityDate ? new Date(selected.lastActivityDate).toLocaleDateString() : "—"}</dd>
              <dt>XP</dt><dd>{selected.xp}</dd>
              <dt>Streak</dt><dd>{selected.streak} days</dd>
              <dt>Reading attempts</dt><dd>{selected._count.readingTestAttempts}</dd>
              <dt>Listening attempts</dt><dd>{selected._count.listeningAttempts}</dd>
              <dt>Mock test sessions</dt><dd>{selected._count.mockTests}</dd>
              <dt>Vocabulary entries</dt><dd>{selected._count.vocabulary}</dd>
              <dt>Achievements</dt><dd>{selected._count.achievements}</dd>
            </dl>
          </form>
        ) : <p className="text-sm text-muted-foreground">Select a user to view and edit their account.</p>}
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      </div>
    </section>
  );
}
