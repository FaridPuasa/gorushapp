require('dotenv').config(); // This loads the hidden keys from your .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startDetrackWatcher } = require('./lib/detrackWatcher');
const { isPostgresOrderIntakeEnabled } = require('./lib/supabaseFlag');

const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Only enforced when the Postgres order-intake flag is on - every environment
// where this stays dormant (the default) needs zero new required config.
if (isPostgresOrderIntakeEnabled() && (!process.env.DATABASE_URL || !process.env.DIRECT_URL)) {
  console.error("❌ SUPABASE_ORDER_INTAKE_ENABLED=true but DATABASE_URL/DIRECT_URL are missing from your .env file!");
  process.exit(1);
}

// Middleware
app.use(cors());
// Career applications can carry up to four base64-encoded uploads (IC front, resume/CV,
// driving license front & back) in one JSON body — bumped from 10mb to comfortably fit
// that worst case (base64 inflates raw file size by ~33%).
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
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

// Pull the connection string securely from the environment file
const MONGO_URI = process.env.MONGO_URI; 

if (!MONGO_URI) {
  console.error("❌ Error: MONGO_URI is missing from your .env file!");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Successfully connected to your paid MongoDB cluster!");
    // Once Postgres order intake is on, orders for these 5 products never land
    // in Mongo anymore - the watcher would have nothing left to see. Detrack
    // job creation happens synchronously instead (see routes/orders.js).
    if (isPostgresOrderIntakeEnabled()) {
      console.log("⏸️  Detrack watcher not started - Postgres order intake is enabled (synchronous Detrack creation instead).");
    } else if (process.env.DETRACK_WATCHER_ENABLED === 'true') {
      // Set DETRACK_WATCHER_ENABLED=true in .env to turn this back on — left off by default
      // to avoid creating live Detrack jobs while testing locally.
      startDetrackWatcher().catch((err) => console.error("❌ Detrack watcher failed to start:", err));
    } else {
      console.log("⏸️  Detrack watcher disabled (set DETRACK_WATCHER_ENABLED=true in .env to enable).");
    }
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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