// Simple demo server for AIAds Platform
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from frontend dist
app.use(express.static(path.join(__dirname, 'src/frontend/dist')));

// Demo API endpoints
app.get('/api/demo/stats', (req, res) => {
  res.json({
    advertisers: 2000,
    kols: 100000,
    gmv: '$22M',
    revenue: '$1.2M'
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/frontend/dist/index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`AIAds Demo Server running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop`);
});
