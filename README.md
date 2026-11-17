# Templadz (v0.1)
Offline-first template editor: design once, mark fields, fill by form or CSV batch, export PDF.
Requires Node.js 20+ on Windows 10/11 (64-bit).

## First run
    npm install
    npm run keys                                   # ONE time: creates your license key pair
    npm run issue -- "Customer name" 2027-12-31    # prints a license code
    npm run dev                                    # paste the code in the activation screen

Back up `tools/keys/private.pem` OFFLINE. Never ship it. Losing it means you cannot issue licenses.
Each build must contain the matching `electron/license-public.pem` (created by `npm run keys`).

## Other commands
    npm test        # unit tests (CSV, fields)
    npm start       # run production bundle
    npm run dist    # Windows installer in /release (unsigned: SmartScreen will warn)

## White-label
Edit `brand/brand.json` (name, accent colour) and `package.json > build` (appId, productName) per client.

## Data
Templates are JSON files in your user-data folder (%APPDATA%/templadz/templates). Share with the Share button (.tpz).
