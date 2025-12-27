import { type Request, type Response, Router } from "express";
import { getImage } from "@/utils";

const router = Router();

router.get("/proxy", async (req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    const { url, productId } = req.query;

    if (!url || typeof url !== "string") {
      const placeholder = Buffer.from(
        `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#e5e7eb"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text></svg>`,
        "utf-8",
      );
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.send(placeholder);
    }

    const imageUrl = decodeURIComponent(url);
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      const placeholder = Buffer.from(
        `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#e5e7eb"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text></svg>`,
        "utf-8",
      );
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.send(placeholder);
    }

    const { buffer, contentType } = await getImage(imageUrl, productId as string | undefined);

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // 1 year
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length.toString());

    res.send(buffer);
  } catch (error) {
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
