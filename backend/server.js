const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const dns = require('dns');

// Prioritize IPv4 DNS resolution to prevent YouTube socket connection drops / false login requirements
dns.setDefaultResultOrder('ipv4first');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend cross-origin requests
app.use(cors({
  origin: [
    'https://ecostream-app.vercel.app',
    'https://total-ecostream.onrender.com',
    'http://localhost:5173',
    'http://localhost',
    'capacitor://localhost'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Body parser middleware
app.use(express.json());

// Import API routers
const searchRoutes = require('./routes/searchRoutes');
const streamRoutes = require('./routes/streamRoutes');
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');

// Mount routes
app.use('/api/search', searchRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);

// General health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Spotify Clone Backend is running!' });
});

// Serve static files from the 'public' folder (built React files)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for React Router (single page app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Initialize dependencies and start server once at startup
async function startServer() {
  try {
    // 1. Connect to MongoDB
    console.log('Connecting to MongoDB...');
    // DO NOT hardcode the string in your code.
    // Use process.env to read from Render's Environment settings.
    await mongoose.connect(process.env.MONGO_URL)
      .then(() => console.log("Connected to MongoDB!"))
      .catch((err) => console.error("Connection failed:", err));

    // Seed featured playlists
    const { seedFeaturedPlaylists } = require('./utils/seeder');
    await seedFeaturedPlaylists();

    // 2. Start server
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize dependencies / start server:', error);
    process.exit(1);
  }
}

startServer();
