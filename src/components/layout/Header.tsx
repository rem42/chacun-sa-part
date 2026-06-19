import React from "react";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Sun, Moon, RotateCcw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";

interface HeaderProps {
  onReset?: () => void;
  canReset?: boolean;
  historyCount?: number;
  onOpenHistory?: () => void;
}

export function Header({ onReset, canReset, historyCount = 0, onOpenHistory }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-[1140px] mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={canReset ? onReset : undefined}
          className={`flex items-center gap-2.5 min-w-0 text-left rounded-lg ${canReset ? "cursor-pointer" : "cursor-default"}`}
          aria-label={canReset ? "Chacun Sa Part — revenir à l’accueil" : "Chacun Sa Part"}
          tabIndex={canReset ? 0 : -1}
        >
          <Logo className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <span className="block font-display font-extrabold text-xl leading-6 tracking-tight text-foreground">
              Chacun <span className="italic text-p1">sa</span> part
            </span>
            <span className="hidden sm:block text-[11px] text-muted-foreground truncate">
              L’impôt du couple, réparti équitablement
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {onOpenHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenHistory}
              className="gap-1.5"
              aria-label={`Historique des simulations${historyCount > 0 ? ` (${historyCount})` : ""}`}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
              {historyCount > 0 && (
                <span className="rounded-full bg-secondary text-secondary-foreground px-1.5 text-[10px] font-bold tabular-nums leading-4">
                  {historyCount}
                </span>
              )}
            </Button>
          )}

          {canReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-1.5"
              aria-label="Commencer une nouvelle simulation"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle simulation</span>
            </Button>
          )}

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="h-9 w-9"
              aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
              title={isDark ? "Thème clair" : "Thème sombre"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
