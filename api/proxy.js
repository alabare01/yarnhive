// api/proxy.js
// Vercel serverless function — proxies external sites for iframe embedding
// Strips X-Frame-Options and CSP headers, rewrites links to stay in proxy

const ALLOWED_DOMAINS = [
  "allfreecrochet.com",
  "garnstudio.com",
  "yarnspirations.com",
  "sarahmaker.com",
  "hopefulhoney.com",
  "thewoobles.com",
  "ravelry.com",
  "lovecrafts.com",
];

function isAllowed(hostname) {
  return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d));
}

function getBase(url) {
  const u = new URL(url);
  return u.origin;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    return res.status(200).end();
  }
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "url parameter required" });

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return res.status(400).json({ error: "Only http/https URLs allowed" });
  }

  if (!isAllowed(parsed.hostname)) {
    return res.status(403).json({ error: "Domain not in allowed list" });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "identity",
      },
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") || "";

    // Non-HTML assets (images, CSS, JS, fonts) — pass through as-is
    if (!contentType.includes("text/html")) {
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.status(upstream.status).send(buffer);
    }

    let html = await upstream.text();
    const base = getBase(targetUrl);
    const proxyBase = "/api/proxy?url=";

    // Rewrite relative URLs to absolute
    html = html.replace(/(href|src|action)=(["'])\//g, `$1=$2${base}/`);

    // Rewrite same-origin absolute links to go through proxy
    const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(
      new RegExp(`(href|src|action)=(["'])(${escapedBase})(/[^"']*)(["'])`, "g"),
      (match, attr, q1, origin, path, q2) => {
        // Don't proxy asset URLs (images, CSS, JS, fonts)
        if (/\.(css|js|png|jpe?g|gif|svg|ico|woff2?|ttf|eot|webp|avif)(\?|$)/i.test(path)) {
          return match;
        }
        return `${attr}=${q1}${proxyBase}${encodeURIComponent(origin + path)}${q2}`;
      }
    );

    // Inject navigation interceptor and import button before </body>
    const injectedScript = `
<script>
(function(){
  // Intercept link clicks to route through proxy
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
    // Already proxied
    if (href.includes('/api/proxy?url=')) return;
    // Build absolute URL
    var absolute;
    try {
      absolute = new URL(href, window.location.href).href;
    } catch(err) { return; }
    // Only proxy same-domain or allowed-domain links
    var hostname;
    try { hostname = new URL(absolute).hostname; } catch(err) { return; }
    var allowed = ${JSON.stringify(ALLOWED_DOMAINS)};
    var match = allowed.some(function(d) { return hostname === d || hostname.endsWith('.' + d); });
    if (!match) {
      // External link — open in new tab
      e.preventDefault();
      window.open(absolute, '_blank', 'noopener,noreferrer');
      return;
    }
    e.preventDefault();
    window.location.href = '/api/proxy?url=' + encodeURIComponent(absolute);
  }, true);

  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    var action = form.getAttribute('action');
    if (!action) return;
    var absolute;
    try { absolute = new URL(action, window.location.href).href; } catch(err) { return; }
    form.setAttribute('action', '/api/proxy?url=' + encodeURIComponent(absolute));
  }, true);
})();
</script>

<div id="wovely-import-btn" style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:999999;pointer-events:auto;">
  <button onclick="window.parent.postMessage({type:'IMPORT_URL',url:location.href},'*')" style="
    background:#9B7EC8;
    color:#fff;
    border:none;
    border-radius:9999px;
    padding:14px 28px;
    font-size:15px;
    font-weight:600;
    font-family:Inter,-apple-system,sans-serif;
    cursor:pointer;
    box-shadow:0 6px 24px rgba(155,126,200,0.5);
    display:flex;
    align-items:center;
    gap:8px;
  "><span style="font-size:18px">🧶</span> Import This Pattern</button>
</div>`;

    // Inject before </body> or at end
    if (html.includes("</body>")) {
      html = html.replace("</body>", injectedScript + "</body>");
    } else {
      html += injectedScript;
    }

    // Add <base> tag so relative asset URLs resolve correctly
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head><base href="${base}/">`);
    } else if (html.includes("<HEAD>")) {
      html = html.replace("<HEAD>", `<HEAD><base href="${base}/">`);
    }

    // Return modified HTML without frame-busting headers
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    // Explicitly do NOT set X-Frame-Options or CSP
    return res.status(200).send(html);

  } catch (err) {
    console.error("[proxy]", err.message);
    return res.status(502).json({ error: "Could not load page: " + err.message });
  }
}
