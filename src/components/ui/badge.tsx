import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "equity" | "cerfa";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground font-semibold shadow-xs",
    secondary: "border-transparent bg-secondary text-secondary-foreground font-medium",
    destructive: "border-destructive/20 bg-destructive/10 text-destructive font-semibold",
    outline: "text-foreground border-border bg-card",
    success: "border-gain/20 bg-gain/10 text-gain font-semibold",
    equity: "border-gain/20 bg-gain/10 text-gain font-semibold",
    cerfa: "font-mono uppercase text-[11px] font-bold tracking-wider bg-muted text-foreground/80 border border-input rounded-md px-1.5 py-0.5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
