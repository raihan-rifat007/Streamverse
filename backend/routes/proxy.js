const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/', async (req, res) => {
  const { url, referer, origin } = req.query;
  if (!url) return res.status(400).json({ error: 'URL parameter required' });

  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL encoding' });
  }

  if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are supported' });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9'
  };
  if (referer) headers['Referer'] = decodeURIComponent(referer);
  if (origin) headers['Origin'] = decodeURIComponent(origin);

  try {
    const response = await axios({
      method: 'GET',
      url: decodedUrl,
      responseType: 'stream',
      timeout: 30000,
      headers,
      maxRedirects: 5
    });

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Content-Type', response.headers['content-type'] || 'application/octet-stream');

    if (response.headers['content-length']) {
      res.set('Content-Length', response.headers['content-length']);
    }

    response.data.pipe(res);
  } catch (err) {
    console.error('[Proxy] Error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to proxy stream', details: err.message });
    }
  }
});

router.options('/', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

module.exports = router;
