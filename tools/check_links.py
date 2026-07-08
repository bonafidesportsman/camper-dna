#!/usr/bin/env python3
"""CamperDNA affiliate link health check.

Checks the DESTINATION of every product link in assets/data/products.json:
- Awin links: extracts and checks the `ued=` destination directly.
  (Never request the awin1.com redirect itself — it registers phantom
  clicks in Awin reporting.)
- Amazon links: checks the /dp/ page WITHOUT the affiliate tag.
- Direct links: checked as-is.

Exit code 1 if any link fails, so it can gate CI.
Usage: python3 tools/check_links.py [--json report.json]
"""
import json
import sys
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36 CamperDNA-LinkCheck")
TIMEOUT = 20


def destination(url: str) -> str:
    if "awin1.com" in url and "ued=" in url:
        return urllib.parse.unquote(url.split("ued=", 1)[1])
    if "amazon." in url:
        # strip affiliate tag for the health check
        parts = urllib.parse.urlsplit(url)
        q = [(k, v) for k, v in urllib.parse.parse_qsl(parts.query) if k != "tag"]
        return urllib.parse.urlunsplit(parts._replace(query=urllib.parse.urlencode(q)))
    return url


def check(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-GB,en;q=0.9"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            return res.status, res.geturl()
    except urllib.error.HTTPError as e:
        return e.code, url
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def main():
    with open("assets/data/products.json") as f:
        data = json.load(f)

    results, failures = [], 0
    for cat, items in data["categories"].items():
        for p in items:
            dest = destination(p["affiliate_url"])
            status, final = check(dest)
            # Amazon serves 503 to bots — treat as "unverifiable", not broken
            ok = status is not None and (status < 400 or ("amazon." in dest and status == 503))
            note = ""
            if "amazon." in dest and status == 503:
                note = "amazon bot-block (503) — verify manually if persistent"
            elif isinstance(final, str) and final.rstrip("/").endswith((".co.uk", ".com")) and "/" in urllib.parse.urlsplit(dest).path.strip("/"):
                if urllib.parse.urlsplit(final).path in ("", "/"):
                    note = "redirected to homepage — product page may be gone"
            if not ok:
                failures += 1
            results.append({"category": cat, "name": p["name"], "dest": dest,
                            "status": status, "ok": ok, "note": note})
            flag = "OK " if ok else "FAIL"
            print(f"[{flag}] {status!s:>4} | {cat:<22} | {p['name'][:40]:<40} {('— ' + note) if note else ''}")

    print(f"\n{len(results)} links checked, {failures} failures")
    if "--json" in sys.argv:
        out = sys.argv[sys.argv.index("--json") + 1]
        with open(out, "w") as f:
            json.dump(results, f, indent=2)
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
