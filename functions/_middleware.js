// CamperDNA – optional site-wide password protection via HTTP Basic Auth.
// Runs as a Cloudflare Pages middleware on every request.
// When CAMPERDNA_GATE_USER and CAMPERDNA_GATE_PASSWORD are unset, the site is public.
// Setting both env vars re-enables the password gate for future pre-launch periods.

export async function onRequest({ request, next, env }) {
  const USERNAME = env.CAMPERDNA_GATE_USER;
  const PASSWORD = env.CAMPERDNA_GATE_PASSWORD;

  if (!USERNAME && !PASSWORD) {
    return next();
  }

  if (!USERNAME || !PASSWORD) {
    return new Response("Access restricted — password gate partially configured.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const auth = request.headers.get("Authorization") || "";

  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const colon = decoded.indexOf(":");
      const user = decoded.slice(0, colon);
      const pass = decoded.slice(colon + 1);
      if (user === USERNAME && pass === PASSWORD) {
        return next();
      }
    } catch (_) {
      // fall through to 401
    }
  }

  return new Response("Access restricted — password required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="CamperDNA"',
      "Content-Type": "text/plain",
    },
  });
}
