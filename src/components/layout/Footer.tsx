import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { LegalDialog } from "@/components/layout/LegalDialog";

export function Footer() {
  const [legalOpen, setLegalOpen] = useState(false);
  return (
    <footer className="border-t border-border bg-card/60 py-8 text-xs text-muted-foreground">
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Logo className="h-6 w-6 shrink-0" aria-hidden />
          <p>
            <span className="font-display font-bold text-foreground text-sm">Chacun sa part</span>
            {" "}— outil indépendant, sans lien avec l’administration fiscale.
            {" "}Créé par{" "}
            <a
              href="https://remy.ovh"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Rémy BRUYERE
            </a>
            .
          </p>
        </div>
        <p className="sm:text-right max-w-md leading-relaxed">
          Résultats indicatifs, à vérifier sur impots.gouv.fr. Vos simulations restent
          enregistrées dans ce navigateur uniquement.{" "}
          <button
            type="button"
            onClick={() => setLegalOpen(true)}
            className="cursor-pointer font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            Mentions légales
          </button>
        </p>
      </div>
      <LegalDialog open={legalOpen} onOpenChange={setLegalOpen} />
    </footer>
  );
}
