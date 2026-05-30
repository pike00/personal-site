/**
 * Public Cloudflare Turnstile site key for the contact form.
 *
 * This key is PUBLIC (it ships in client HTML) — safe to commit. The matching
 * SECRET key is set as the `TURNSTILE_SECRET` Pages env secret and is read only
 * by functions/api/contact.ts; never put the secret here.
 *
 * Set the real key by exporting PUBLIC_TURNSTILE_SITE_KEY at build time (e.g.
 * in build.env.sops, threaded through `just deploy`), or replace the placeholder
 * default below. Create the widget at: Cloudflare dashboard → Turnstile.
 */
export const TURNSTILE_SITE_KEY =
  import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? "REPLACE_WITH_TURNSTILE_SITE_KEY";
