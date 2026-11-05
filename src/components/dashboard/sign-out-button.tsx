"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, LoaderCircle } from "lucide-react";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut({ callbackUrl: "/login" });
      }}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#E8E8F0] bg-white px-4 text-sm font-semibold text-[#4B4965] transition hover:bg-[#F7F7FA] disabled:opacity-60"
    >
      {busy ? <LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> : <LogOut aria-hidden="true" size={16} />}
      Log out
    </button>
  );
}
