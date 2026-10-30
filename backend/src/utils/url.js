// backend/src/utils/url.js

function toAbsoluteUrl(req, pathStr) {
  if (!pathStr) return null;
  if (typeof pathStr !== 'string') return pathStr;
  
  // If it's already an absolute URL, leave it alone
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
    return pathStr;
  }

  // 1. Prefer PUBLIC_API_URL (which is set to your https ngrok URL).
  // We strip the /api part so we just get the root domain.
  const publicApiUrl = process.env.PUBLIC_API_URL;
  if (publicApiUrl) {
    try {
      const urlObj = new URL(publicApiUrl);
      return `${urlObj.protocol}//${urlObj.host}${pathStr}`;
    } catch (e) {
      // fall through if the URL is malformed
    }
  }

  // 2. Fallback to proxy headers (x-forwarded-proto / x-forwarded-host)
  // This is what ngrok uses.
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;

  return `${proto}://${host}${pathStr}`;
}

module.exports = { toAbsoluteUrl };