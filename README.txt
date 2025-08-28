
# Simple PDF Tools Neo (OOP / PWA / EXIF / ES256 QR Seal)

## Structure
- `index.html` (JA), `en/index.html`, `es/index.html`
- `assets/app.css`, `assets/app.js` (OOP modules)
- `manifest.json`, `service-worker.js`
- `icons/icon-192.png`, `icons/icon-512.png`
- `og.png`
- `verify.html` (QR scan + verification)

## Notes
- Cryptographic seal is an **ES256 QR seal**, not a PAdES digital signature.
- EXIF auto-rotation is applied on Images→PDF.
- PWA includes offline cache and auto-update flow.

Host at site root or adjust paths for subdirectory deployments.
