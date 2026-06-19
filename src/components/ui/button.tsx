import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer touch-manipulation";

    const variants = {
      default:
        "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary-hover",
      destructive:
        "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
      outline:
        "border border-input bg-card text-foreground hover:bg-muted/50 shadow-layer-1",
      secondary:
        "border-[1.5px] border-primary-hover bg-card text-primary-hover hover:bg-secondary font-semibold shadow-layer-1",
      ghost: "text-muted-foreground hover:text-foreground hover:bg-muted/60",
      link: "text-primary underline-offset-4 hover:underline",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-lg px-3 text-sm",
      lg: "h-12 rounded-xl px-7 py-3 text-base font-semibold",
      icon: "h-10 w-10",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
