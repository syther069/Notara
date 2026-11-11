// The light / dark button: the "Spin" toggle from toggles.dev (@theme-toggles/react, MIT), used as
// published. Notara sets its length to 360ms with the product's expo-out easing (theme.css), sizes its hit
// area, and names it by what pressing it will do. Under reduced motion the icon swaps without spinning
// (the package's own motion-safe rules). It is a plain button whose name says what it will do, so it
// carries no pressed state. One theme state for the whole site: components/Layout.tsx.
import { Spin } from "@theme-toggles/react";
import "@theme-toggles/react/styles/spin.css";
import { useTheme } from "@/components/Layout";
import { cn } from "@/lib/utils";

export function SpinThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { resolved, setChoice } = useTheme();
  const dark = resolved === "dark";
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <Spin
      duration={360}
      aria-label={label}
      title={label}
      data-mode={dark ? "Dark" : "Light"}
      onClick={() => setChoice(dark ? "light" : "dark")}
      className={cn(
        dark ? "dark" : "light",
        "spin-toggle inline-flex shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-200",
        showLabel
          ? "h-9 gap-2 border border-border bg-surface/90 px-3.5 text-[16px] hover:border-highlight hover:bg-surface-secondary after:font-sans after:text-[13px] after:font-semibold after:tracking-[-0.01em] after:content-[attr(data-mode)]"
          : "size-10 text-[19px] hover:bg-foreground/10",
        className,
      )}
    />
  );
}
