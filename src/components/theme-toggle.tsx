"use client";

import { useTheme } from "next-themes";
import { flushSync } from "react-dom";
import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const themes = ["light", "system", "dark"] as const;
const iconMap = { light: Sun, system: Monitor, dark: Moon } as const;
const labelMap = { light: "Light", system: "System", dark: "Dark" } as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (mounted ? theme : "system") as keyof typeof iconMap;
  const Icon = iconMap[current] || Monitor;

  const cycle = () => {
    const next = themes[(themes.indexOf(current) + 1) % themes.length];

    if (
      !(document as any).startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTheme(next);
      return;
    }

    document.documentElement.dataset.themeSwitching = "";
    const transition = (document as any).startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    transition.finished.then(() => {
      delete document.documentElement.dataset.themeSwitching;
    });
  };

  return (
    <button
      onClick={cycle}
      className="flex h-7 items-center justify-center px-2 text-muted-foreground transition-colors hover:text-foreground"
      title={labelMap[current]}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
