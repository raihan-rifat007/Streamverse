require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { generalLimiter } = require('./middleware/rateLimit');

const channelsRouter = require('./routes/channels');
const proxyRouter = require('./routes/proxy');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: IS_PROD ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:', 'http:', 'blob:'],
      mediaSrc: ["'self'", 'https:', 'http:', 'blob:'],
      connectSrc: ["'self'", 'https:', 'http:', 'wss:', 'ws:'],
      workerSrc: ["'self'", 'blob:'],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"]
    }
  } : false
}));

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(generalLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api/channels', channelsRouter);
app.use('/api/proxy', proxyRouter);

if (IS_PROD) {
  const distPath = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: true
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`StreamVerse Backend running on port ${PORT} [${IS_PROD ? 'production' : 'development'}]`);
});

const cacheCleanInterval = 2 * 60 * 60 * 1000;
setInterval(() => {
  try {
    const cache = require('./utils/cache');
    const before = cache.keys().length;
    const staleKeys = cache.keys().filter(k => {
      const ttl = cache.getTtl(k);
      return ttl && ttl < Date.now();
    });
    staleKeys.forEach(k => cache.del(k));
    console.log(`[Cache] Cleanup: removed ${staleKeys.length} stale entries (${before} → ${cache.keys().length})`);
  } catch (e) {
    console.warn('[Cache] Cleanup error:', e.message);
  }
}, cacheCleanInterval);
