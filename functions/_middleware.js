// CamperDNA – site-wide password protection via HTTP Basic Auth
// Runs as a Cloudflare Pages middleware on every request.
// To change credentials, update USERNAME / PASSWORD below and redeploy.

const USERNAME = "bonafidesportsman";
const PASSWORD = "camperdna-21";

export async function onRequest({ request, next }) {
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
