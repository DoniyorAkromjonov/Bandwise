"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { AdminPanelLink } from "@/components/admin/admin-panel-link";
import { Brand } from "@/components/layout/brand";
import { ThemeSettings } from "@/components/theme/theme-settings";

const navLinks = [
  { label: "Courses", href: "#courses" },
  { label: "IELTS Practice", href: "#skills" },
  { label: "Resources", href: "#features" },
  { label: "About", href: "#about" },
];

function ProfileControls({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-end gap-3">
      <Link href="/dashboard" title={name} className="min-w-0 max-w-36 truncate rounded-full px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
        {name}
      </Link>
      {isAdmin && <AdminPanelLink />}
      <ThemeSettings rounded />
      <SignOutButton callbackUrl="/" rounded />
    </div>
  );
}

export function SiteHeader({ profileName, isAdmin }: { profileName: string | null; isAdmin: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-20 border-b border-border bg-card">
      <div className="page-shell flex h-[76px] items-center justify-between gap-6">
        <Brand />
        <nav aria-label="Main navigation" className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="link-underline text-sm font-medium text-muted-foreground hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {profileName ? <ProfileControls name={profileName} isAdmin={isAdmin} /> : <>
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-offset-2">Log in</Link>
            <Link href="/register" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-offset-2">Sign up</Link>
          </>}
        </div>
        <button
          type="button"
          className="inline-grid size-11 place-items-center rounded-xl border border-border text-foreground lg:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
        </button>
      </div>
      {menuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="absolute left-0 right-0 top-full border-b border-border bg-card px-6 py-5 shadow-lg lg:hidden">
          <div className="page-shell flex flex-col gap-1">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                {link.label}
              </a>
            ))}
            <div className="mt-3 border-t border-border pt-4">
              {profileName ? <ProfileControls name={profileName} isAdmin={isAdmin} /> : <div className="grid grid-cols-2 gap-3">
                <Link onClick={() => setMenuOpen(false)} href="/login" className="rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold">Log in</Link>
                <Link onClick={() => setMenuOpen(false)} href="/register" className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white">Sign up</Link>
              </div>}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
