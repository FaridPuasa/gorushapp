require('dotenv').config(); // This loads the hidden keys from your .env file
const express = require('express');
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
app.use('/api', require('./routes/content'));

// Serves the Expo Router web export's index.html for every non-API route,
// so client-side routing (e.g. refreshing on /my-orders) resolves instead
// of 404ing. Falls back to a plain status message when no web build is
// present (e.g. local dev without ever having run the export).
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(__dirname, 'webapp', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("Go Rush Backend Server is active.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});