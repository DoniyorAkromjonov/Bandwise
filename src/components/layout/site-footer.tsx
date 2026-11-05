import Link from "next/link";
import { Brand } from "@/components/layout/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#E8E8F0] bg-white">
      <div className="page-shell flex flex-col gap-8 py-9 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Brand />
          <p className="mt-3 text-sm text-[#666580]">A thoughtful way to prepare for IELTS.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#666580]">
          <Link href="#courses" className="hover:text-[#24213D]">Courses</Link>
          <Link href="#skills" className="hover:text-[#24213D]">IELTS Practice</Link>
          <Link href="#about" className="hover:text-[#24213D]">About</Link>
          <Link href="/login" className="hover:text-[#24213D]">Log in</Link>
        </nav>
        <p className="text-xs text-[#77768F]">© 2026 Bandwise</p>
      </div>
    </footer>
  );
}
