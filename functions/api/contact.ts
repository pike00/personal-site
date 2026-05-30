/**
 * Cloudflare Pages Function: contact form handler.
 *
 * Flow: POST /api/contact  ->  verify Turnstile token  ->  post the message to a
 * Mattermost incoming webhook (homelab). Cloudflare Email Sending was the first
 * choice but requires a paid Workers plan (enable returned 2036 Unauthorized on
 * the free plan), so delivery goes to Mattermost instead — free and reachable
 * from the CF edge because chat.khanpikehome.com is public-tier.
 *
 * Required environment (set as Pages project env vars / secrets — see CLAUDE.md):
 *   TURNSTILE_SECRET        secret  — Turnstile widget secret key
 *   MATTERMOST_WEBHOOK_URL  secret  — Mattermost incoming webhook URL
 *                                     (https://chat.khanpikehome.com/hooks/<id>)
 *
 * Untyped context to avoid a build-time dependency on @cloudflare/workers-types;
 * wrangler transpiles this with esbuild (no typecheck) at deploy.
 */

interface Env {
  TURNSTILE_SECRET: string;
  MATTERMOST_WEBHOOK_URL: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string | null,
): Promise<boolean> {
  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    if (ip) form.append("remoteip", ip);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function onRequestPost(
  context: RequestContext,
): Promise<Response> {
  const { request, env } = context;

  if (!env.TURNSTILE_SECRET || !env.MATTERMOST_WEBHOOK_URL) {
    return json(500, { error: "Contact form is not configured." });
  }

  let payload: {
    name?: unknown;
    email?: unknown;
    message?: unknown;
    token?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid request body." });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";
  const token = typeof payload.token === "string" ? payload.token : "";

  if (!name || !email || !message) {
    return json(400, { error: "Name, email, and message are required." });
  }
  if (!EMAIL_RE.test(email)) {
    return json(400, { error: "Please provide a valid email address." });
  }
  if (message.length > 5000) {
    return json(400, { error: "Message is too long (5000 char max)." });
  }
  if (!token) {
    return json(400, { error: "Missing verification token." });
  }

  const ip = request.headers.get("CF-Connecting-IP");
  if (!(await verifyTurnstile(env.TURNSTILE_SECRET, token, ip))) {
    return json(400, { error: "Verification failed. Please try again." });
  }

  // Mattermost renders the `text` field as markdown. Fence the message body in a
  // blockquote and neutralize backticks so a pasted code block can't break out.
  const quoted = message
    .split("\n")
    .map((line) => `> ${line.replace(/`/g, "ʼ")}`)
    .join("\n");
  const text =
    `**📬 New contact form submission** — pikemd.com\n` +
    `**From:** ${name} (\`${email}\`)\n\n${quoted}`;

  try {
    const res = await fetch(env.MATTERMOST_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "pikemd.com", text }),
    });
    if (!res.ok) {
      return json(502, { error: "Failed to send message. Please try later." });
    }
  } catch {
    return json(502, { error: "Failed to send message. Please try later." });
  }

  return json(200, { ok: true });
}
