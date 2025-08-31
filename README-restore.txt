Restore guide (Neo tools + rich content) — 2025-08-31

1) Upload index.html to the repo root (sebasuchan2212.github.io).
   - This index already contains ALL tool cards (merge/split/compress/img2pdf with EXIF, editor, watermark, pdf->img, OCR).
   - It also includes the long-form content, FAQ, and footer links (terms/privacy/contact).

2) AdSense:
   - Replace data-ad-slot values with your Slot IDs.
   - Ensure /assets/adsafe.js exists (from the compliance pack) to guard ads on content pages only.

3) PWA (if used):
   - If updates don't appear, bump your service-worker cache name and redeploy OR hard-reload the site.

4) If features still look missing:
   - Your old service worker might be serving cached HTML. Do a hard refresh (Shift+Reload) or update SW cache key.
   - Open DevTools Console to confirm no JS errors.
