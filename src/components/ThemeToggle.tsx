import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "claro" : "escuro";

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={toggleTheme}
      aria-label={`Ativar tema ${nextTheme}`}
      title={`Ativar tema ${nextTheme}`}
      className="shrink-0"
    >
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span className="hidden sm:inline">Tema {nextTheme}</span>
    </Button>
  );
}
