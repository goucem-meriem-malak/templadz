// Vendor tool. NEVER ship tools/keys/private.pem. Back it up offline: losing it means you cannot issue licenses.
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const keyDir = path.join(__dirname, 'keys');
const priv = path.join(keyDir, 'private.pem');
const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'init') {
  if (fs.existsSync(priv)) { console.error('Keys already exist. Refusing to overwrite.'); process.exit(1); }
  fs.mkdirSync(keyDir, { recursive: true });
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(priv, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(path.join(__dirname, '..', 'electron', 'license-public.pem'), publicKey.export({ type: 'spki', format: 'pem' }));
  console.log('Keys created. Back up tools/keys/private.pem OFFLINE.');
} else if (cmd === 'issue') {
  const [name, exp] = args;
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(exp || '')) { console.error('Usage: npm run issue -- "Customer name" YYYY-MM-DD'); process.exit(1); }
  const key = crypto.createPrivateKey(fs.readFileSync(priv));
  const payload = Buffer.from(JSON.stringify({ name, exp })).toString('base64url');
  console.log(payload + '.' + crypto.sign(null, Buffer.from(payload), key).toString('base64url'));
} else { console.error('Commands: init | issue'); process.exit(1); }
