// CamperDNA – site-wide password protection via HTTP Basic Auth
// Runs as a Cloudflare Pages middleware on every request.
// To change credentials, update VALID_TOKEN below (base64 of "username:password") and redeploy.
// Current credentials: camperdna / bonafidesportsman

const VALID_TOKEN = "Y2FtcGVyZG5hOmJvbmFmaWRlc3BvcnRzbWFu";

export async function onRequest({ request, next }) {
  const auth = request.headers.get("Authorization") || "";

  if (auth === `Basic ${VALID_TOKEN}`) {
    return next();
  }

  return new Response("Access restricted — password required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="CamperDNA Preview"',
      "Content-Type": "text/plain",
    },
  });
}
