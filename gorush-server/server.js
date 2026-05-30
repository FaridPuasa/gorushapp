require('dotenv').config(); // This loads the hidden keys from your .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));

// Pull the connection string securely from the environment file
const MONGO_URI = process.env.MONGO_URI; 

if (!MONGO_URI) {
  console.error("❌ Error: MONGO_URI is missing from your .env file!");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Successfully connected to your paid MongoDB cluster!"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.get('/', (req, res) => {
  res.send("Go Rush Backend Server is active.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});