require('dotenv').config(); // This loads the hidden keys from your .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startDetrackWatcher } = require('./lib/detrackWatcher');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/warga-emas-orders', require('./routes/wargaEmasOrders'));

// Pull the connection string securely from the environment file
const MONGO_URI = process.env.MONGO_URI; 

if (!MONGO_URI) {
  console.error("❌ Error: MONGO_URI is missing from your .env file!");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Successfully connected to your paid MongoDB cluster!");
    startDetrackWatcher().catch((err) => console.error("❌ Detrack watcher failed to start:", err));
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.get('/', (req, res) => {
  res.send("Go Rush Backend Server is active.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});