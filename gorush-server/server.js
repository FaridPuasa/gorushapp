require('dotenv').config(); // This loads the hidden keys from your .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startDetrackWatcher } = require('./lib/detrackWatcher');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
// Career applications can carry up to four base64-encoded uploads (IC front, resume/CV,
// driving license front & back) in one JSON body — bumped from 10mb to comfortably fit
// that worst case (base64 inflates raw file size by ~33%).
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/warga-emas-orders', require('./routes/wargaEmasOrders'));
app.use('/api/careers', require('./routes/careers'));
app.use('/api/admin', require('./routes/admin'));
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
    // Set DETRACK_WATCHER_ENABLED=true in .env to turn this back on — left off by default
    // to avoid creating live Detrack jobs while testing locally.
    if (process.env.DETRACK_WATCHER_ENABLED === 'true') {
      startDetrackWatcher().catch((err) => console.error("❌ Detrack watcher failed to start:", err));
    } else {
      console.log("⏸️  Detrack watcher disabled (set DETRACK_WATCHER_ENABLED=true in .env to enable).");
    }
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.get('/', (req, res) => {
  res.send("Go Rush Backend Server is active.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});