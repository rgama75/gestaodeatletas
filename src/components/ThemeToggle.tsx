import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemePref, type ThemePref } from "@/lib/theme";

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Dia", Icon: Sun },
  { value: "dark", label: "Noite", Icon: Moon },
  { value: "system", label: "Auto", Icon: Monitor },
];

export function ThemeToggle() {
  const [pref, setPref] = useThemePref();
  return (
    <div role="group" aria-label="Aparência" className="grid grid-cols-3 gap-1 rounded-lg border bg-secondary/50 p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={pref === value}
          title={value === "system" ? "Automático (segue o sistema)" : `Modo ${label.toLowerCase()}`}
          onClick={() => setPref(value)}
          className={cn(
            "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:min-h-9",
            pref === value && "bg-primary text-primary-foreground hover:text-primary-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
