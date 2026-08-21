const { Octokit } = require('@octokit/rest');

// Rate limiting (in memory; resets on restart)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip) {
    const now = Date.now();
    const key = `diag_${ip}`;
    const limit = rateLimitStore.get(key);
    if (!limit || now > limit.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }
    if (limit.count >= RATE_LIMIT_MAX) return false;
    limit.count++;
    return true;
}

function validateOrigin(headers) {
    const origin = headers.origin || headers.referer;
    if (!origin) return false;
    const allowed = [
        'https://sphings-dev.de',
        'http://localhost:3000',
        'http://localhost:8000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8000',
        'http://127.0.0.1:5173',
    ];
    return allowed.some((a) => origin.startsWith(a));
}

function fence(value) {
    let str;
    try {
        str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    } catch {
        str = String(value);
    }
    return '```json\n' + (str || 'null') + '\n```';
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Origin',
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed - use POST' }) };
    }

    if (!validateOrigin(event.headers)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden - invalid origin' }) };
    }

    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    if (!checkRateLimit(clientIP)) {
        return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limit exceeded' }) };
    }

    let payload;
    try {
        payload = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const {
        device = {},
        apiUrls = {},
        firmwareResponse = null,
        communicationResponse = null,
        advancedSettings = null,
        meta = {},
    } = payload || {};

    if (!process.env.GITHUB_TOKEN) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'GitHub token not configured' }),
        };
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = 'sphings79';
    const repo = 'marstek-fw-diagnostics'; // PRIVATE repo — dumps are not public

    const devType = device.type || 'unknown';
    const devId = device.devid || 'unknown';
    const submittedAt = new Date().toISOString();

    const issueTitle = `[Diagnostics] ${devType} ${devId} — ${submittedAt}`;
    const issueBody = `## Diagnostic data submission

**Device Type:** ${devType}
**Device ID:** ${devId}
**Device Name:** ${device.name || '—'}
**Submitted:** ${submittedAt}

### Device
${fence(device)}

### API URLs (tester)
${fence(apiUrls)}

### Firmware API response
${fence(firmwareResponse)}

### Communication (FC41D) API response
${fence(communicationResponse)}

### Advanced settings
${fence(advancedSettings)}

### Client
${fence(meta)}

---
*Submitted from the Marstek Firmware Downloader diagnostics button.*
`;

    try {
        const { data: issue } = await octokit.rest.issues.create({
            owner,
            repo,
            title: issueTitle,
            body: issueBody,
            labels: ['diagnostics'],
        });
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, issueNumber: issue.number, issueUrl: issue.html_url }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to submit diagnostics', message: err.message }),
        };
    }
};
