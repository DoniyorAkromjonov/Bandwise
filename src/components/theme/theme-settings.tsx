"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Moon, Settings2, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeSettings({ rounded = false }: { rounded?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectTheme(value: "light" | "dark") {
    setTheme(value);
    setOpen(false);
  }

  return <div ref={rootRef} className="relative">
    <button type="button" aria-label="Appearance settings" title="Appearance settings" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className={`grid size-11 place-items-center border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-offset-2 ${rounded ? "rounded-full" : "rounded-xl"}`}>
      <Settings2 aria-hidden="true" size={18} />
    </button>
    {open && <section id={panelId} aria-label="Appearance settings" className={`absolute top-[calc(100%+0.5rem)] z-50 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-[0_18px_48px_-24px_rgba(12,14,22,.55)] ${rounded ? "-right-24 sm:right-0" : "right-0"}`}>
      <p className="px-2 pb-2 text-sm font-semibold">Appearance</p>
      <div role="group" aria-label="Color theme" className="grid grid-cols-2 gap-2">
        <ThemeOption active={theme === "light"} label="Light" onClick={() => selectTheme("light")}><Sun size={16} /></ThemeOption>
        <ThemeOption active={theme === "dark"} label="Dark" onClick={() => selectTheme("dark")}><Moon size={16} /></ThemeOption>
      </div>
      <p className="px-2 pt-3 text-xs leading-5 text-muted-foreground">Your choice is saved on this device.</p>
    </section>}
  </div>;
}

function ThemeOption({ active, label, onClick, children }: { active: boolean; label: string; onClick(): void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition focus-visible:outline-offset-2 ${active ? "border-primary/50 bg-secondary text-secondary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
    {children}{label}{active && <Check aria-hidden="true" size={14} className="ml-auto" />}
  </button>;
}
