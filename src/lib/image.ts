"use client";

/**
 * Client-side image thumbnailer.
 *
 * Vercel's serverless filesystem is read-only (except /tmp), so instead of
 * uploading image files to the server, we downscale them in the browser and
 * embed the result as a JPEG data URL. At `maxDim = 480, quality = 0.7`, a
 * typical phone photo becomes ~30–60KB — small enough to live inline in a
 * Postgres text column (`Ticket.imageUrl`).
 *
 * Runs entirely in the browser: <img> → <canvas> → toDataURL.
 */
export function fileToThumbnailDataUrl(
  file: File,
  maxDim = 480,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("fileToThumbnailDataUrl can only run in the browser"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image"));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const longest = Math.max(origW, origH);
        let scale = 1;
        if (longest > maxDim) scale = maxDim / longest;
        const w = Math.max(1, Math.round(origW * scale));
        const h = Math.max(1, Math.round(origH * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Canvas 2D context unavailable");
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}
