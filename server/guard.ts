// Small safety checks for the local backend. Kept apart from index.ts so tests can import them
// without starting the server.

type Headers = Record<string, string | string[] | undefined>;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * Why this request must be refused, or null if it's fine. Stops other websites (CSRF) and
 * DNS rebinding from using the owner key or starting demo runs. Scripts without these headers pass.
 * shortcut: localhost only, replace with real login before any public deploy.
 */
export function refuseReason(method: string, path: string, h: Headers): string | null {
  const risky = (method !== "GET" && method !== "HEAD") || path === "/api/demo/run";
  if (!risky) return null;
  const host = String(h.host ?? "").split(":")[0];
  if (!LOCAL_HOSTS.has(host)) return "Unknown host";
  const site = h["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return "Cross-site request";
  if (h.origin) {
    let originHost = "";
    try {
      originHost = new URL(String(h.origin)).host;
    } catch {}
    if (originHost !== h.host) return "Cross-site request";
  }
  // A JSON content type makes browsers ask permission first, which this server never grants.
  if (method !== "GET" && !String(h["content-type"] ?? "").startsWith("application/json")) return "Content-Type must be application/json";
  return null;
}

const busy = new Set<string>();

/** Runs fn unless the same key is already running; then returns undefined without running it. */
export async function runOnce<T>(key: string, fn: () => Promise<T>): Promise<T | undefined> {
  if (busy.has(key)) return undefined;
  busy.add(key);
  try {
    return await fn();
  } finally {
    busy.delete(key);
  }
}
