require('dotenv').config(); // This loads the hidden keys from your .env file
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Order intake is Postgres-only (see routes/orders.js) - these are always required now.
if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
  console.error("❌ DATABASE_URL/DIRECT_URL are missing from your .env file!");
  process.exit(1);
}

// Middleware
// Allowlist built from what index.html/offline.html and the client actually load:
// - script-src: Google Tag Manager's gtag.js, plus 'unsafe-inline' for index.html's own
//   inline <script> blocks (GA init, service worker registration, PWA install listener) -
//   there's no per-request templating here to stamp a nonce into that static file, so a
//   nonce isn't an option without a bigger change.
// - img-src: 'self'/data: (default) for same-origin assets and the base64 hero-slide images
//   (lib/imageCompress.js stores those directly in Postgres), plus Supabase Storage, where
//   POD photos/JPMC payment proofs/job application docs actually live (lib/podImageStorage.js
//   and friends) - a wildcard since the exact project subdomain lives in an env var, not here.
// - connect-src: 'self' (default, same-origin API calls) plus GA's own ping/collect domains.
// - frame-src: the Google Maps embed on the Contact Us page (contactInfo.js's
//   GOOGLE_MAPS_EMBED_URL).
// Cross-Origin-Resource-Policy left off - its default 'same-origin' would block the browser
// from reading this API's responses in local dev, where gorush-client's own dev server (a
// different host/port - see app.json's apiBaseUrl) calls it cross-origin; in production
// client and API share an origin, so this costs nothing there.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
      imgSrc: ["'self'", 'data:', 'https://*.supabase.co'],
      connectSrc: ["'self'", 'https://www.google-analytics.com', 'https://analytics.google.com', 'https://www.googletagmanager.com'],
      frameSrc: ["'self'", 'https://www.google.com'],
    },
  },
  crossOriginResourcePolicy: false,
}));
app.use(cors());
// Gzips every response (API JSON + the webapp bundle/HTML below) - same bytes
// decoded client-side, just smaller over the wire. Biggest win for the ~1.9MB
// unsplit Expo web bundle every visitor downloads on first load.
app.use(compression());
// Career applications can carry up to four base64-encoded uploads (IC front, resume/CV,
// driving license front & back) in one JSON body — bumped from 10mb to comfortably fit
// that worst case (base64 inflates raw file size by ~33%).
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
// `expo export`'s content-hashed output (filenames embed a build hash, e.g.
// entry-<hash>.js / logo.<hash>.png) - safe to cache for a long time with
// `immutable` since any new build gets new filenames, never reusing an old
// hash for different content. Mounted before the generic webapp static below
// so these two prefixes get long-cache headers while everything else under
// webapp/ (index.html, favicon.ico, metadata.json - NOT content-hashed) keeps
// the default short/no-cache behavior, since index.html itself must always
// be revalidated to pick up a new build's asset hashes.
const HASHED_BUILD_ASSET_OPTIONS = { maxAge: '1y', immutable: true };
app.use('/_expo', express.static(path.join(__dirname, 'webapp', '_expo'), HASHED_BUILD_ASSET_OPTIONS));
app.use('/assets', express.static(path.join(__dirname, 'webapp', 'assets'), HASHED_BUILD_ASSET_OPTIONS));
// gorush-client's `expo export -p web` output (built by the heroku-postbuild
// script - see root package.json). Kept separate from ./public, which
// already holds hand-placed static assets (e.g. terms-and-conditions.pdf)
// that the export would otherwise wipe out on every build.
app.use(express.static('webapp'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/warga-emas-orders', require('./routes/wargaEmasOrders'));
app.use('/api/careers', require('./routes/careers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/jpmc', require('./routes/jpmc'));
app.use('/api/partner', require('./routes/partnerPortal'));
app.use('/api', require('./routes/content'));

// Every real page gorush-client's app/ directory defines (expo-router's file-based routing -
// keep this in sync with that directory). Used below to tell a genuine route from a typo/stale
// link, since both are otherwise indistinguishable to this catch-all.
const KNOWN_CLIENT_ROUTES = new Set([
  '/', '/about-us', '/admin', '/careers', '/contact-us', '/dashboard', '/delivery-rates',
  '/edit-profile', '/get-the-app', '/jpmc-portal', '/latest-update', '/local-delivery-calculator',
  '/login', '/my-orders', '/order-form', '/privacy-policy', '/search-jobs', '/sign-up',
  '/warga-emas-form',
]);

// Serves the Expo Router web export's index.html for every non-API route, so client-side
// routing (e.g. refreshing on /my-orders) resolves instead of 404ing. Falls back to a plain
// status message when no web build is present (e.g. local dev without ever having run the
// export). A path outside KNOWN_CLIENT_ROUTES still gets the same SPA shell (expo-router
// renders its own not-found screen client-side), but with a real 404 status - without this,
// search engines saw every typo'd/stale URL as a normal 200 page (a "soft 404") and could
// index it.
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(__dirname, 'webapp', 'index.html');
  if (!fs.existsSync(indexPath)) {
    res.send("Go Rush Backend Server is active.");
    return;
  }
  const cleanPath = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  if (!KNOWN_CLIENT_ROUTES.has(cleanPath)) {
    res.status(404);
  }
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});