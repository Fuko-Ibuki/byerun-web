const BACKEND_URL = process.env.BACKEND_URL || '';

function getPath(req) {
  const path = req.query.path || [];
  if (Array.isArray(path)) {
    return path.join('/') || '';
  }
  return String(path || '');
}

function getQuery(req) {
  const url = req.url || '';
  const idx = url.indexOf('?');
  return idx >= 0 ? url.slice(idx) : '';
}

function normalizeHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === 'host') continue;
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export default async function handler(req, res) {
  if (!BACKEND_URL) {
    return res.status(500).json({ error: 'BACKEND_URL is not configured' });
  }

  const path = getPath(req);
  const query = getQuery(req);
  const targetUrl = `${BACKEND_URL.replace(/\/+$/, '')}/${path}${query}`;

  const init = {
    method: req.method,
    headers: normalizeHeaders(req.headers),
    body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? null : JSON.stringify(req.body),
  };

  try {
    const response = await fetch(targetUrl, init);
    const body = await response.arrayBuffer();

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    return res.send(Buffer.from(body));
  } catch (error) {
    return res.status(502).json({ error: 'Proxy request failed', message: error.message });
  }
}
