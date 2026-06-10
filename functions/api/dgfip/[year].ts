/// <reference types="@cloudflare/workers-types" />

/**
 * Relais Cloudflare Pages Function vers le simulateur officiel de la DGFiP.
 *
 * Le simulateur n'envoie pas d'en-têtes CORS : le navigateur ne peut pas l'appeler directement.
 * Cette fonction n'est appelée que depuis le même domaine que l'application (aucun en-tête CORS
 * n'est ajouté, donc elle ne sert pas de relais ouvert à d'autres sites) et ne transmet que le
 * formulaire vers l'unique URL `calc-[année].cgi`. Rien n'est journalisé ni conservé.
 */

const DGFIP_ORIGIN = 'https://simulateur-ir-ifi.impots.gouv.fr';
const MAX_BODY_BYTES = 64 * 1024;
const TIMEOUT_MS = 8000;

export const onRequestPost: PagesFunction = async ({ request, params }) => {
  const year = String(params.year ?? '');
  if (!/^20\d{2}$/.test(year)) {
    return new Response('Année invalide', { status: 400 });
  }

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return new Response('Requête trop volumineuse', { status: 413 });
  }

  try {
    const upstream = await fetch(`${DGFIP_ORIGIN}/cgi-bin/calc-${year}.cgi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Simulateur DGFiP injoignable', { status: 502 });
  }
};
