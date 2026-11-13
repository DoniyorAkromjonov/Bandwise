import Link from "next/link";
import { Brand } from "@/components/layout/brand";

export function SiteFooter({ authenticated }: { authenticated: boolean }) {
  return (
    <footer className="border-t border-border bg-card">
      <div className="page-shell flex flex-col gap-8 py-9 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Brand />
          <p className="mt-3 text-sm text-muted-foreground">A thoughtful way to prepare for IELTS.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <Link href="#courses" className="hover:text-foreground">Courses</Link>
          <Link href="#skills" className="hover:text-foreground">IELTS Practice</Link>
          <Link href="#about" className="hover:text-foreground">About</Link>
          {!authenticated && <Link href="/login" className="hover:text-foreground">Log in</Link>}
        </nav>
        <p className="text-xs text-muted-foreground">© 2026 Bandwise</p>
      </div>
    </footer>
  );
}
