import Link from "next/link";
import { Shield } from "lucide-react";

export function AdminPanelLink() {
  return (
    <Link
      href="/dashboard/admin"
      aria-label="Admin panel"
      title="Admin panel"
      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-muted"
    >
      <Shield aria-hidden="true" size={16} />
      <span className="hidden whitespace-nowrap sm:inline">Admin panel</span>
    </Link>
  );
}
