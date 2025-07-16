const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: String,
  image: String,
  pubDate: { type: Date, required: true },
  source: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  category: String
}, { timestamps: true });

module.exports = mongoose.model('Article', ArticleSchema);
