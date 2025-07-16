const Parser = require('rss-parser');
const Article = require('./models/Article');
const fs = require('fs');
const path = require('path');

const parser = new Parser();
const sourcesPath = path.join(__dirname, 'news_sources.json');

async function fetchAndStoreArticles() {
  const sources = JSON.parse(fs.readFileSync(sourcesPath));
  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items) {
        const article = {
          title: item.title,
          summary: item.contentSnippet || item.summary || '',
          image: extractImage(item),
          pubDate: item.isoDate || item.pubDate || new Date(),
          source: source.name,
          url: item.link,
          category: item.categories ? (Array.isArray(item.categories) ? item.categories[0] : item.categories) : ''
        };
        // Upsert by URL
        await Article.updateOne(
          { url: article.url },
          { $set: article },
          { upsert: true }
        );
      }
    } catch (err) {
      console.error(`Error fetching from ${source.name}:`, err.message);
    }
  }
}

function extractImage(item) {
  // Try to extract image from media:content, enclosure, or content
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) return item['media:content']['$'].url;
  // Try to find an image in content
  const imgMatch = (item.content || '').match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];
  return '';
}

module.exports = { fetchAndStoreArticles };
