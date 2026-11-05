"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/layout/brand";

const navLinks = [
  { label: "Courses", href: "#courses" },
  { label: "IELTS Practice", href: "#skills" },
  { label: "Resources", href: "#features" },
  { label: "About", href: "#about" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-20 border-b border-[#E8E8F0] bg-white">
      <div className="page-shell flex h-[76px] items-center justify-between gap-6">
        <Brand />
        <nav aria-label="Main navigation" className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="link-underline text-sm font-medium text-[#666580] hover:text-[#24213D]">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#24213D] transition hover:bg-[#F7F7FA] focus-visible:outline-offset-2">Log in</Link>
          <Link href="/register" className="rounded-xl bg-[#7047FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5D35EB] focus-visible:outline-offset-2">Sign up</Link>
        </div>
        <button
          type="button"
          className="inline-grid size-11 place-items-center rounded-xl border border-[#E8E8F0] text-[#24213D] lg:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
        </button>
      </div>
      {menuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="absolute left-0 right-0 top-full border-b border-[#E8E8F0] bg-white px-6 py-5 shadow-lg lg:hidden">
          <div className="page-shell flex flex-col gap-1">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-[#666580] hover:bg-[#F7F7FA] hover:text-[#24213D]">
                {link.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#E8E8F0] pt-4">
              <Link onClick={() => setMenuOpen(false)} href="/login" className="rounded-xl border border-[#E8E8F0] px-4 py-3 text-center text-sm font-semibold">Log in</Link>
              <Link onClick={() => setMenuOpen(false)} href="/register" className="rounded-xl bg-[#7047FF] px-4 py-3 text-center text-sm font-semibold text-white">Sign up</Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
