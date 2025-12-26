import { type Request, type Response, Router } from "express";
import { AppError } from "@/lib/error";
import { errorResponse, successResponse } from "@/lib/response";
import { getImage } from "@/utils/image-cache";

const router = Router();

/**
 * GET /images/proxy
 * Proxy and cache images, converting HTTP to HTTPS
 * Query params: url (required), productId (optional)
 */
router.get("/proxy", async (req: Request, res: Response) => {
  // Add CORS headers for images
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    const { url, productId } = req.query;

    if (!url || typeof url !== "string") {
      // Return placeholder SVG instead of error
      const placeholder = Buffer.from(
        `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#e5e7eb"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text></svg>`,
        "utf-8",
      );
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.send(placeholder);
    }

    // Decode the URL
    const imageUrl = decodeURIComponent(url);

    // Validate URL
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      // Return placeholder for invalid URLs
      const placeholder = Buffer.from(
        `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#e5e7eb"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text></svg>`,
        "utf-8",
      );
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.send(placeholder);
    }

    // Get or download image (will return placeholder if download fails)
    const { buffer, contentType } = await getImage(imageUrl, productId as string | undefined);

    // Set cache headers
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // 1 year
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length.toString());

    // Send image
    res.send(buffer);
  } catch (error) {
    // Always return an image, even on error
    console.error("Error proxying image:", error);
    const placeholder = Buffer.from(
      `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#e5e7eb"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text></svg>`,
      "utf-8",
    );
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(placeholder);
  }
});

export default router;
