import { AlertCircle } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="max-w-3xl mx-auto mb-6 flex items-start gap-2 p-3 text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20"
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <span>
        <strong className="font-semibold">Le calcul n’a pas pu aboutir.</strong> {message}
      </span>
    </div>
  );
}
