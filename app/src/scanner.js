const { URL } = require('url');

const REQUIRED_SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options'
];

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/
];

/**
 * Validates and normalizes an HTTP/HTTPS target URL.
 * Blocks loopback/private hosts by default unless ALLOW_PRIVATE_TARGETS=true.
 */
function validateTargetUrl(rawUrl, allowPrivate = process.env.ALLOW_PRIVATE_TARGETS === 'true') {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https protocols are allowed');
  }

  if (!allowPrivate && PRIVATE_HOST_PATTERNS.some((rx) => rx.test(parsed.hostname))) {
    throw new Error('Private or loopback hosts are blocked by policy');
  }

  return parsed.toString();
}

/**
 * Evaluates HTTP availability, latency, and core defensive security headers.
 */
async function scanTargetUrl(targetUrl, fetchFn = fetch, timeoutMs = 5000) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(targetUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal
    });

    const latencyMs = Date.now() - startedAt;
    const headersPresent = {};
    let headerScore = 0;

    for (const headerName of REQUIRED_SECURITY_HEADERS) {
      const value = response.headers.get(headerName);
      const present = Boolean(value && value.trim().length > 0);
      headersPresent[headerName] = present;
      if (present) {
        headerScore += 20;
      }
    }

    const availabilityScore = response.status >= 200 && response.status < 400 ? 20 : 0;

    return {
      statusCode: response.status,
      latencyMs,
      score: availabilityScore + headerScore,
      headersPresent,
      errorMessage: null
    };
  } catch (err) {
    return {
      statusCode: null,
      latencyMs: Date.now() - startedAt,
      score: 0,
      headersPresent: Object.fromEntries(REQUIRED_SECURITY_HEADERS.map((h) => [h, false])),
      errorMessage: err.name === 'AbortError' ? 'Request timed out' : err.message
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  REQUIRED_SECURITY_HEADERS,
  validateTargetUrl,
  scanTargetUrl
};
