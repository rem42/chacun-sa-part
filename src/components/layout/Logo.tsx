import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Le « % » de Chacun Sa Part : un anneau par conjoint (couleurs D1 / D2),
 * séparés par la barre de partage à l'encre de la marque.
 */
export function Logo({ className = "h-8 w-8", size, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Chacun Sa Part"
      {...props}
    >
      <path d="M71 23 29 77" stroke="hsl(var(--primary))" strokeWidth="9" strokeLinecap="round" />
      <circle cx="31" cy="31" r="13" stroke="hsl(var(--p0))" strokeWidth="9" />
      <circle cx="69" cy="69" r="13" stroke="hsl(var(--p1))" strokeWidth="9" />
    </svg>
  );
}
