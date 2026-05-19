const { Octokit } = require('@octokit/rest');

// Rate limiting store (in memory - resets on function restart)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 100;

function checkRateLimit(ip) {
    const now = Date.now();
    const key = ip;
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }
    const limit = rateLimitStore.get(key);
    if (now > limit.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }
    if (limit.count >= RATE_LIMIT_MAX_REQUESTS) return false;
    limit.count++;
    return true;
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    if (!checkRateLimit(clientIP)) {
        return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limit exceeded', message: 'Maximum 100 requests per hour' }) };
    }

    try {
        const params = event.queryStringParameters || {};
        const { deviceType, firmwareType, version } = params;

        const requiredParams = (deviceType && (deviceType === 'HME-4' || deviceType === 'HME-3'))
            ? ['deviceType', 'version']
            : ['deviceType', 'firmwareType', 'version'];

        for (const param of requiredParams) {
            if (!params[param]) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required parameters', required: requiredParams, provided: params }) };
            }
        }

        // VNSD-0 (Marstek Venus D) und VNSA-0 (Marstek Venus A) ergänzt
        const validDeviceTypes = ['HMG-50', 'HMG-25', 'VNSE3-0', 'VNSD-0', 'VNSA-0', 'HME-4', 'HME-3'];
        if (!validDeviceTypes.includes(deviceType)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid device type', validTypes: validDeviceTypes, provided: deviceType }) };
        }

        if (!process.env.GITHUB_TOKEN) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'GitHub token not configured', message: 'Server configuration error' }) };
        }

        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        // -------------------------------------------------------
        // Geändertes Repository: sphings79/marstek-firmware-archiv
        // -------------------------------------------------------
        const owner = 'sphings79';
        const repo  = 'marstek-firmware-archiv';

        const isCTDevice = deviceType === 'HME-4' || deviceType === 'HME-3';
        const path = isCTDevice
            ? `firmwares/${deviceType}/${version}`
            : `firmwares/${deviceType}/${firmwareType}/${version}`;

        try {
            const { data: contents } = await octokit.rest.repos.getContent({ owner, repo, path });

            let metadata = null;
            let firmwareFile = null;

            if (Array.isArray(contents)) {
                const metadataFile = contents.find(file => file.name === 'metadata.json');
                const binFile = contents.find(file => file.name.endsWith('.bin'));

                if (metadataFile) {
                    try {
                        const { data: metadataContent } = await octokit.rest.repos.getContent({ owner, repo, path: metadataFile.path });
                        const metadataJson = Buffer.from(metadataContent.content, 'base64').toString('utf-8');
                        metadata = JSON.parse(metadataJson);
                    } catch (error) {
                        console.log('Error reading metadata:', error.message);
                    }
                }

                if (binFile) {
                    firmwareFile = {
                        name: binFile.name,
                        size: binFile.size,
                        downloadUrl: `https://github.com/${owner}/${repo}/raw/main/${binFile.path}`,
                        sha: binFile.sha
                    };
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ exists: true, path, metadata, firmwareFile, githubUrl: `https://github.com/${owner}/${repo}/tree/main/${path}` })
            };

        } catch (error) {
            if (error.status === 404) {
                return { statusCode: 200, headers, body: JSON.stringify({ exists: false, path, message: 'Firmware version not found in archive' }) };
            }
            throw error;
        }

    } catch (error) {
        console.error('Error checking firmware archive:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: error.message }) };
    }
};
