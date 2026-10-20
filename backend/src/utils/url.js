// Turn a stored relative file path into an absolute URL for clients.
//
// The database stores product image paths as `/uploads/products/abc.jpg`.
// Mobile and admin need a full URL like `http://10.252.93.80:3000/uploads/products/abc.jpg`.
// We derive host and protocol from the incoming request, so the URL is always
// correct for whichever address the client used to reach us — and IP changes
// do not require any database update.

function toAbsoluteUrl(req, value) {
  if (!value || typeof value !== 'string') return value;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value; // already an external URL, leave untouched
  }
  if (!value.startsWith('/')) return value; // not a path we manage
  return `${req.protocol}://${req.get('host')}${value}`;
}

module.exports = { toAbsoluteUrl };