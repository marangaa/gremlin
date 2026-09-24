/**
 * Canonical Chrome Web Store listing URL for the published Gremlin extension.
 * Single source of truth — every "install" CTA on the site links here.
 */
export const CWS_URL = 'https://chromewebstore.google.com/detail/polekllkblhmcgnmlgodmfaemgecahid';

/** Opens the CWS listing in a new tab (safe opener semantics). */
export function openCwsListing(): void {
  window.open(CWS_URL, '_blank', 'noopener,noreferrer');
}
