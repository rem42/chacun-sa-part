/**
 * Couleurs d'identité par rôle. Les classes sont écrites en entier pour que
 * Tailwind les détecte : ne pas les construire dynamiquement.
 */
export type Tone = "p0" | "p1" | "household";

export const TONES: Record<
  Tone,
  {
    text: string;
    solid: string;
    soft: string;
    border: string;
    dot: string;
    hoverBorder: string;
  }
> = {
  p0: {
    text: "text-p0",
    solid: "bg-p0 text-white dark:text-background",
    soft: "bg-p0/8",
    border: "border-p0/30",
    dot: "bg-p0",
    hoverBorder: "hover:border-p0 hover:text-p0",
  },
  p1: {
    text: "text-p1",
    solid: "bg-p1 text-white dark:text-background",
    soft: "bg-p1/8",
    border: "border-p1/30",
    dot: "bg-p1",
    hoverBorder: "hover:border-p1 hover:text-p1",
  },
  household: {
    text: "text-household",
    solid: "bg-household text-white dark:text-background",
    soft: "bg-household/8",
    border: "border-household/30",
    dot: "bg-household",
    hoverBorder: "hover:border-household hover:text-household",
  },
};

export const partnerTone = (index: 0 | 1): Tone => (index === 0 ? "p0" : "p1");
