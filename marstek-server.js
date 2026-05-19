/**
 * marstek-server.js — Thin Express Adapter
 *
 * Ruft die originalen Netlify Functions unverändert auf.
 * Deployment: https://sphings-dev.de/marstek/marstek-fw-checker/
 *
 * Benötigt (einmalig):
 *   npm install
 *   npm install express node-fetch@2
 *
 * Start:
 *   node marstek-server.js
 *   GITHUB_TOKEN=ghp_xxx node marstek-server.js
 */

const express = require('express');
const app     = express();

app.use(express.json());
app.use(express.static(__dirname));   // index.html, script.js, styles.css

// ------------------------------------------------------------------
// Adapter: Express req/res → Netlify event-Objekt
// ------------------------------------------------------------------
function toEvent(req) {
  return {
    httpMethod:            req.method,
    queryStringParameters: req.query   || {},
    headers: {
      ...req.headers,
      // submit-firmware-metadata.js prüft den Origin-Header gegen eine
      // Whitelist. Da wir hinter einem Reverse Proxy laufen, setzen wir
      // ihn auf einen der erlaubten Werte — localhost:3000 steht bereits
      // in der Liste des Originalskripts.
      origin: 'http://localhost:3000',
    },
    body: req.body ? JSON.stringify(req.body) : null,
  };
}

function sendResult(result, res) {
  res.status(result.statusCode || 200);
  if (result.headers) {
    Object.entries(result.headers).forEach(([k, v]) => res.set(k, v));
  }
  if (result.isBase64Encoded) {
    res.send(Buffer.from(result.body, 'base64'));
  } else {
    res.send(result.body || '');
  }
}

// ------------------------------------------------------------------
// Originale Netlify Functions — unverändert
// ------------------------------------------------------------------
const proxyFn   = require('./netlify/functions/marstek-proxy');
const archiveFn = require('./netlify/functions/check-firmware-archive');
const submitFn  = require('./netlify/functions/submit-firmware-metadata');

// ------------------------------------------------------------------
// Routen — exakt die Pfade, die script.js aufruft
// ------------------------------------------------------------------
app.all('/.netlify/functions/marstek-proxy', async (req, res) => {
  const result = await proxyFn.handler(toEvent(req), {});
  sendResult(result, res);
});

app.all('/.netlify/functions/check-firmware-archive', async (req, res) => {
  const result = await archiveFn.handler(toEvent(req), {});
  sendResult(result, res);
});

app.all('/.netlify/functions/submit-firmware-metadata', async (req, res) => {
  const result = await submitFn.handler(toEvent(req), {});
  sendResult(result, res);
});

// ------------------------------------------------------------------
// Start — nur auf localhost, Apache übernimmt als Reverse Proxy
// ------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n✅ Marstek FW Checker läuft auf http://localhost:${PORT}`);
  console.log(`   Erreichbar unter: https://sphings-dev.de/marstek/marstek-fw-checker/`);
  console.log(`   GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '✅ gesetzt' : '⚠️  nicht gesetzt (Archive-Feature inaktiv)'}`);
  console.log(`   Strg+C zum Beenden\n`);
});
