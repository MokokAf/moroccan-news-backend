require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./db');
const Article = require('./models/Article');
const { fetchAndStoreArticles } = require('./rssFetcher');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 4000;

// Allow localhost:3000 (frontend dev) and * (for now) - update for production!
const allowedOrigins = [
  'http://localhost:3000',
  // Add your deployed frontend URL here when ready, e.g.:
  // 'https://moroccan-news-frontend.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// --- API Endpoints ---

/**
 * GET /api/news
 * Query params: page, pageSize, source, category, q (search)
 */
app.get('/api/news', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, source, category, q } = req.query;
    const filter = {};
    if (source) filter.source = source;
    if (category) filter.category = category;
    if (q) filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { summary: { $regex: q, $options: 'i' } }
    ];
    const articles = await Article.find(filter)
      .sort({ pubDate: -1 })
      .skip((page - 1) * pageSize)
      .limit(Number(pageSize));
    const total = await Article.countDocuments(filter);
    res.json({ articles, total });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/**
 * POST /api/news/refresh
 * Triggers manual fetch (for dev/admin)
 */
app.post('/api/news/refresh', async (req, res) => {
  try {
    await fetchAndStoreArticles();
    res.json({ message: 'Actualités rafraîchies.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du rafraîchissement.' });
  }
});

// --- Start server and schedule fetching ---
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`API en ligne sur http://localhost:${PORT}`);
  });
  // Fetch every 15 minutes
  cron.schedule('*/15 * * * *', fetchAndStoreArticles);
  // Initial fetch at startup
  fetchAndStoreArticles();
});

module.exports = app;