const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function publicKey() {
  try { return fs.readFileSync(path.join(__dirname, 'license-public.pem'), 'utf8'); }
  catch { return null; }
}

// A code is "<base64url payload>.<base64url Ed25519 signature>"; payload = {name, exp:'YYYY-MM-DD'}
function verifyCode(code, now = new Date()) {
  const key = publicKey();
  if (!key) return { ok: false, reason: 'nokey' };
  const [a, b] = String(code || '').trim().split('.');
  if (!a || !b) return { ok: false, reason: 'format' };
  try {
    if (!crypto.verify(null, Buffer.from(a), key, Buffer.from(b, 'base64url'))) {
      return { ok: false, reason: 'signature' };
    }
    const d = JSON.parse(Buffer.from(a, 'base64url').toString());
    const info = { name: d.name, exp: d.exp };
    if (new Date(d.exp + 'T23:59:59Z') < now) return { ok: false, reason: 'expired', ...info };
    return { ok: true, ...info };
  } catch { return { ok: false, reason: 'format' }; }
}
module.exports = { verifyCode };
