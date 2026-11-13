"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, LoaderCircle } from "lucide-react";

export function SignOutButton({ callbackUrl = "/login", rounded = false }: { callbackUrl?: string; rounded?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={busy ? "Logging out" : "Log out"}
      onClick={async () => {
        setBusy(true);
        try {
          await signOut({ callbackUrl });
        } finally {
          setBusy(false);
        }
      }}
      className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-border bg-card px-3 text-sm text-foreground/80 transition hover:bg-muted disabled:opacity-60 sm:px-4 ${rounded ? "rounded-full" : "rounded-xl font-semibold"}`}
    >
      {busy ? <LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> : <LogOut aria-hidden="true" size={16} />}
      <span className={rounded ? undefined : "hidden min-[400px]:inline"}>Log out</span>
    </button>
  );
}
