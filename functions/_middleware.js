// CamperDNA - optional site-wide password protection via HTTP Basic Auth.
// Runs as a Cloudflare Pages middleware on every request.
// When CAMPERDNA_GATE_USER and CAMPERDNA_GATE_PASSWORD are unset, the site is public.
// Setting both env vars re-enables the password gate for future pre-launch periods.


const VALID_ROUTES = new Set([
  '/',
  '/blog/',
  '/blog/2026-02-20-swb-vs-lwb.html',
  '/blog/2026-02-28-spec-for-uk-winters.html',
  '/blog/2026-03-08-campervan-conversion-costs.html',
  '/blog/2026-03-15-pre-purchase-inspection-guide.html',
  '/blog/2026-03-18-what-to-ask-your-converter.html',
  '/blog/2026-03-20-donor-van-vs-pre-converted.html',
  '/blog/2026-08-11-vw-campervan-festival-checklist.html',
  '/buying-a-van/',
  '/buying-a-van/inspection-checklist.html',
  '/cookie-policy/',
  '/credits/',
  '/how-we-make-money/',
  '/kit/',
  '/kit/accessories.html',
  '/kit/bike-racks.html',
  '/kit/electronics-audio.html',
  '/kit/heating.html',
  '/kit/insurance-inspection.html',
  '/kit/solar-electrical.html',
  '/privacy/',
  '/spec-sheet/',
  '/the-vans/',
  '/your-camperdna/',
]);

const PASSTHROUGH_PREFIXES = [
  '/assets/',
  '/cdn-cgi/',
  '/functions/',
];

const PASSTHROUGH_FILES = new Set([
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/status.txt',
  '/404.html',
]);

export async function onRequest({ request, next, env }) {
  const USERNAME = env.CAMPERDNA_GATE_USER;
  const PASSWORD = env.CAMPERDNA_GATE_PASSWORD;

  if (!USERNAME && !PASSWORD) {
    return routeOr404(request, next);
  }

  if (!USERNAME || !PASSWORD) {
    return new Response("Access restricted - password gate partially configured.", {
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
        return routeOr404(request, next);
      }
    } catch (_) {
      // fall through to 401
    }
  }

  return new Response("Access restricted - password required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="CamperDNA"',
      "Content-Type": "text/plain",
    },
  });
}


async function routeOr404(request, next) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return next();
  }

  const url = new URL(request.url);
  const pathname = normalizePathname(url.pathname);

  if (
    VALID_ROUTES.has(pathname) ||
    PASSTHROUGH_FILES.has(pathname) ||
    PASSTHROUGH_PREFIXES.some(prefix => pathname.startsWith(prefix))
  ) {
    return next();
  }

  const notFoundHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page not found | CamperDNA</title>
  <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="policy-page">
  <main class="policy-body" style="min-height:45vh;text-align:center;">
    <h1>Page not found</h1>
    <p>That page is not part of CamperDNA, or it may have moved.</p>
    <p><a class="btn btn-primary" href="/">Back to CamperDNA</a></p>
  </main>
</body>
</html>`;
  return new Response(notFoundHTML, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store',
    },
  });
}

function normalizePathname(pathname) {
  if (pathname === '/index.html') return '/';
  if (pathname.endsWith('/index.html')) {
    return pathname.slice(0, -'index.html'.length);
  }
  if (!pathname.includes('.') && !pathname.endsWith('/')) {
    return `${pathname}/`;
  }
  return pathname;
}
