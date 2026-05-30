import os from "node:os";

/**
 * Structured-logging helper for the TypeScript build scripts (generate-citations,
 * check-assets). Mirrors scripts/loki.sh: one JSON line to stderr plus a
 * fire-and-forget push to the homelab Loki API. Never throws and never blocks
 * the build — an unreachable Loki (e.g. in CI or the dev container) is ignored.
 *
 *   labels: job=personal-site, script=<name>, host=<hostname>
 */
const LOKI_URL =
  process.env.LOKI_URL ?? "http://127.0.0.1:3100/loki/api/v1/push";

export async function lokiEmit(
  script: string,
  level: "info" | "warn" | "error",
  msg: string,
  extra: Record<string, string | number> = {},
): Promise<void> {
  const line = JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    ...extra,
  });
  process.stderr.write(line + "\n");

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    await fetch(LOKI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streams: [
          {
            stream: {
              job: "personal-site",
              script,
              host: os.hostname(),
              level,
            },
            values: [[`${Date.now()}000000`, line]],
          },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
  } catch {
    // fire-and-forget: build correctness never depends on Loki
  }
}
