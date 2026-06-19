import { Scale } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LegalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const linkClass = "font-medium text-foreground underline underline-offset-2 hover:text-primary";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="font-display font-bold text-foreground text-base">{title}</h3>
      {children}
    </section>
  );
}

export function LegalDialog({ open, onOpenChange }: LegalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" aria-hidden />
            <span>Mentions légales et confidentialité</span>
          </DialogTitle>
          <DialogDescription>
            Conformément à l’article 6-III de la loi n° 2004-575 du 21 juin 2004 (LCEN) et au RGPD.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <Section title="Éditeur du site">
            <p>
              Le site « Chacun sa part » est édité par la société <strong className="text-foreground">BRUYERE</strong>{" "}
              (SAS), SIREN 909 982 712, SIRET 909 982 712 00012.
            </p>
            <p>
              Directeur de la publication : <strong className="text-foreground">Rémy BRUYERE</strong> ·{" "}
              <a href="https://remy.ovh" target="_blank" rel="noopener noreferrer" className={linkClass}>
                remy.ovh
              </a>{" "}
              · Contact : <a href="mailto:me@remy.ovh" className={linkClass}>me@remy.ovh</a>
            </p>
            <p>
              Ce service est gratuit, sans publicité et non commercial : il est proposé à titre personnel et
              de démonstration.
            </p>
          </Section>

          <Section title="Hébergement">
            <p>
              Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107, États-Unis (Cloudflare Pages).{" "}
              <a href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer" className={linkClass}>
                cloudflare.com
              </a>
            </p>
          </Section>

          <Section title="Nature du service">
            <p>
              Outil indépendant, sans lien avec l’administration fiscale. Les calculs d’impôt sont obtenus
              auprès du simulateur officiel de la DGFiP ; les résultats sont indicatifs et doivent être
              vérifiés sur impots.gouv.fr. L’éditeur ne saurait être tenu responsable d’une décision prise
              sur la base de ces résultats.
            </p>
          </Section>

          <Section title="Données personnelles">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">Lecture du PDF :</strong> votre avis d’imposition ou
                déclaration est lu dans votre navigateur ; le fichier n’est pas envoyé à un serveur.
              </li>
              <li>
                <strong className="text-foreground">Simulation :</strong> les montants saisis ou extraits sont
                transmis, via un relais technique hébergé chez Cloudflare, au simulateur de la DGFiP afin de
                calculer l’impôt. Ce relais ne conserve ni ne journalise ces montants. Le traitement par la
                DGFiP relève de ses propres règles.
              </li>
              <li>
                <strong className="text-foreground">Historique :</strong> vos simulations sont enregistrées
                uniquement dans le stockage local de votre navigateur. Vous pouvez les supprimer à tout moment
                depuis l’historique ou en vidant les données du site.
              </li>
              <li>
                <strong className="text-foreground">Aucun compte, cookie ou traceur</strong> publicitaire ou
                statistique n’est utilisé ; l’éditeur n’a donc pas accès à vos données. Comme tout hébergeur,
                Cloudflare peut traiter techniquement votre adresse IP pour acheminer et sécuriser les requêtes.
              </li>
            </ul>
            <p>
              Conformément au RGPD, vous disposez de droits d’accès, de rectification et d’effacement ; l’éditeur
              ne détenant aucune donnée vous concernant, ils s’exercent directement dans votre navigateur. Pour
              toute question, écrivez à l’adresse ci-dessus. Vous pouvez aussi saisir la{" "}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className={linkClass}>
                CNIL
              </a>
              .
            </p>
          </Section>

          <Section title="Propriété intellectuelle">
            <p>
              Le code, le nom et l’identité visuelle du site sont la propriété de l’éditeur, sauf mention
              contraire. Les barèmes et résultats fiscaux proviennent de la DGFiP.
            </p>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
