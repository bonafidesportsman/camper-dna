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

  if (isKnownRoute(pathname)) {
    return next();
  }

  if (
    PASSTHROUGH_FILES.has(pathname) ||
    PASSTHROUGH_PREFIXES.some(prefix => pathname.startsWith(prefix)) ||
    isKnownLocalAsset(pathname)
  ) {
    return next();
  }

  const notFoundHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nothing here but an empty pitch | CamperDNA</title>
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="policy-page">
  <header class="site-header">
    <nav class="site-nav">
      <a href="/" class="site-logo"><img src="/assets/images/logo.png" alt="CamperDNA"><span>CamperDNA</span></a>
      <ul class="nav-links">
        <li><a href="/your-camperdna/">Your CamperDNA</a></li>
        <li><a href="/the-vans/">The Vans</a></li>
        <li><a href="/kit/">Kit &amp; Gear</a></li>
        <li><a href="/blog/">The Logbook</a></li>
      </ul>
      <button class="nav-toggle" aria-label="Menu" aria-expanded="false"><svg class="icon-hamburger" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg><svg class="icon-close" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg></button>
    </nav>
  </header>
  <main class="not-found-body">
    <h1>Nothing here but an empty pitch</h1>
    <p>No page, no awning, no kettle on. Try one of the main CamperDNA guides instead.</p>
    <p><a class="btn btn-primary" href="/">Take me Home</a></p>
  </main>
  <script src="/assets/js/nav.js" defer></script>
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



function isKnownLocalAsset(pathname) {
  return /^\/[-a-z0-9\/]+\.(css|js|mjs|json|png|jpg|jpeg|webp|svg|ico|txt|xml)$/i.test(pathname);
}

function isKnownRoute(pathname) {
  if (VALID_ROUTES.has(pathname)) return true;
  if (pathname.endsWith('/')) {
    return VALID_ROUTES.has(`${pathname.slice(0, -1)}.html`);
  }
  return VALID_ROUTES.has(`${pathname}.html`);
}

function normalizePathname(pathname) {
  if (pathname === '/index.html') return '/';
  if (pathname.endsWith('/index.html')) {
    return pathname.slice(0, -'index.html'.length);
  }
  return pathname;
}
