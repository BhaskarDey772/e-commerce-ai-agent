import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { AppError } from "@/lib/error";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import {
  getCachedBrands,
  getCachedCategories,
  getCachedProductDetail,
  getCachedProducts,
  setCachedBrands,
  setCachedCategories,
  setCachedProductDetail,
  setCachedProducts,
} from "@/utils/product-cache";
import { parseSpecifications } from "@/utils/spec-parser";

const router = Router();

// Validation schemas
const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sortBy: z
    .enum(["price_asc", "price_desc", "rating_desc", "name_asc", "name_desc", "newest"])
    .default("newest"),
  search: z.string().optional(),
});

const productIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /products
 * Get all products with pagination, filtering, sorting, and searching
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const queryParams = productQuerySchema.parse(req.query);

    // Try to get from cache
    const cacheKey = {
      page: queryParams.page,
      limit: queryParams.limit,
      category: queryParams.category || "",
      brand: queryParams.brand || "",
      minPrice: queryParams.minPrice || "",
      maxPrice: queryParams.maxPrice || "",
      minRating: queryParams.minRating || "",
      sortBy: queryParams.sortBy,
      search: queryParams.search || "",
    };

    const cached = await getCachedProducts(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const page = queryParams.page;
    const limit = queryParams.limit;
    const skip = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (queryParams.category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(queryParams.category);
      paramIndex++;
    }

    if (queryParams.brand) {
      conditions.push(`brand = $${paramIndex}`);
      params.push(queryParams.brand);
      paramIndex++;
    }

    if (queryParams.minPrice !== undefined) {
      conditions.push(`"discountedPrice" >= $${paramIndex}`);
      params.push(queryParams.minPrice);
      paramIndex++;
    }

    if (queryParams.maxPrice !== undefined) {
      conditions.push(`"discountedPrice" <= $${paramIndex}`);
      params.push(queryParams.maxPrice);
      paramIndex++;
    }

    if (queryParams.minRating !== undefined) {
      conditions.push(`("productRating" >= $${paramIndex} OR "overallRating" >= $${paramIndex})`);
      params.push(queryParams.minRating);
      paramIndex++;
    }

    if (queryParams.search) {
      conditions.push(
        `("productName" ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR category ILIKE $${paramIndex} OR brand ILIKE $${paramIndex})`,
      );
      params.push(`%${queryParams.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Build ORDER BY clause
    let orderBy = "";
    switch (queryParams.sortBy) {
      case "price_asc":
        orderBy = `ORDER BY "discountedPrice" ASC NULLS LAST`;
        break;
      case "price_desc":
        orderBy = `ORDER BY "discountedPrice" DESC NULLS LAST`;
        break;
      case "rating_desc":
        orderBy = `ORDER BY COALESCE("productRating", "overallRating", 0) DESC NULLS LAST`;
        break;
      case "name_asc":
        orderBy = `ORDER BY "productName" ASC`;
        break;
      case "name_desc":
        orderBy = `ORDER BY "productName" DESC`;
        break;
      case "newest":
      default:
        orderBy = `ORDER BY "createdAt" DESC`;
        break;
    }

    // Build queries
    const productsQuery = `
      SELECT 
        id, "uniqId", pid, "productName", "productUrl", category, "categoryTree",
        "retailPrice", "discountedPrice", image, images, description,
        "productRating", "overallRating", brand, specifications,
        "isFKAdvantage", "crawlTimestamp", "createdAt", "updatedAt"
      FROM "Product"
      ${whereClause}
      ${orderBy}
      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1}
    `;
    params.push(limit, skip);

    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM "Product"
      ${whereClause}
    `;

    const [products, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(productsQuery, ...params),
      prisma.$queryRawUnsafe<Array<{ count: number }>>(
        countQuery,
        ...params.slice(0, params.length - 2),
      ),
    ]);

    const total = totalResult[0]?.count || 0;

    // Parse images JSON
    const formattedProducts = products.map((product: any) => {
      let images: string[] = [];
      if (product.images) {
        try {
          images = JSON.parse(product.images);
        } catch {
          images = [];
        }
      }

      const specifications = parseSpecifications(product.specifications);

      return {
        id: product.id,
        uniqId: product.uniqId,
        pid: product.pid,
        name: product.productName,
        productUrl: product.productUrl,
        category: product.category,
        categoryTree: product.categoryTree,
        retailPrice: product.retailPrice,
        price: product.discountedPrice || product.retailPrice || null,
        originalPrice: product.retailPrice || null,
        image: product.image || images[0] || null,
        images,
        description: product.description,
        rating: product.productRating || product.overallRating,
        productRating: product.productRating,
        overallRating: product.overallRating,
        brand: product.brand,
        specifications,
        isFKAdvantage: product.isFKAdvantage,
        crawlTimestamp: product.crawlTimestamp,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    const response = successResponse({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        category: queryParams.category,
        brand: queryParams.brand,
        minPrice: queryParams.minPrice,
        maxPrice: queryParams.maxPrice,
        minRating: queryParams.minRating,
        search: queryParams.search,
        sortBy: queryParams.sortBy,
      },
    });

    // Cache the response
    await setCachedProducts(cacheKey, response);

    return res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const appError = AppError.BadRequest("Invalid query parameters");
      return res.status(appError.statusCode).json(errorResponse(appError));
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error));
    }
    throw error;
  }
});

/**
 * GET /products/search
 * Text-based search for products (no embeddings)
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = z
      .string()
      .min(1)
      .max(500)
      .parse(req.query.q || req.query.query);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    // Perform text-based search
    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        uniqId: string;
        productName: string;
        category: string;
        discountedPrice: number | null;
        retailPrice: number | null;
        image: string | null;
        images: string | null;
        description: string | null;
        productRating: number | null;
        overallRating: number | null;
        brand: string | null;
      }>
    >(
      `
      SELECT 
        id, "uniqId", "productName", category, "discountedPrice", "retailPrice",
        image, images, description, "productRating", "overallRating", brand
      FROM "Product"
      WHERE 
        "productName" ILIKE $1 OR 
        description ILIKE $1 OR 
        category ILIKE $1 OR 
        brand ILIKE $1
      ORDER BY 
        CASE 
          WHEN "productName" ILIKE $1 THEN 1
          WHEN brand ILIKE $1 THEN 2
          WHEN category ILIKE $1 THEN 3
          ELSE 4
        END,
        "createdAt" DESC
      LIMIT $2
      `,
      `%${query}%`,
      limit,
    );

    const formattedResults = results.map((product) => {
      let images: string[] = [];
      if (product.images) {
        try {
          images = JSON.parse(product.images);
        } catch {
          images = [];
        }
      }

      return {
        id: product.id,
        uniqId: product.uniqId,
        name: product.productName,
        category: product.category,
        price: product.discountedPrice || product.retailPrice || null,
        originalPrice: product.retailPrice || null,
        image: product.image || images[0] || null,
        images,
        description: product.description,
        rating: product.productRating || product.overallRating,
        brand: product.brand,
      };
    });

    return res.json(
      successResponse({
        query,
        results: formattedResults,
        count: formattedResults.length,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const appError = AppError.BadRequest("Invalid query parameters");
      return res.status(appError.statusCode).json(errorResponse(appError));
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error));
    }
    throw error;
  }
});

/**
 * GET /products/:id
 * Get a specific product by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = productIdSchema.parse({ id: req.params.id });

    const product = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        uniqId: string;
        pid: string | null;
        productName: string;
        productUrl: string | null;
        category: string;
        categoryTree: string | null;
        retailPrice: number | null;
        discountedPrice: number | null;
        image: string | null;
        images: string | null;
        description: string | null;
        productRating: number | null;
        overallRating: number | null;
        brand: string | null;
        specifications: string | null;
        isFKAdvantage: boolean;
        crawlTimestamp: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(
      `SELECT 
        id, "uniqId", pid, "productName", "productUrl", category, "categoryTree",
        "retailPrice", "discountedPrice", image, images, description,
        "productRating", "overallRating", brand, specifications,
        "isFKAdvantage", "crawlTimestamp", "createdAt", "updatedAt"
      FROM "Product" 
      WHERE id = $1 
      LIMIT 1`,
      id,
    );

    if (product.length === 0 || !product[0]) {
      throw AppError.NotFound("Product not found");
    }

    const p = product[0];
    let images: string[] = [];
    if (p.images) {
      try {
        images = JSON.parse(p.images);
      } catch {
        images = [];
      }
    }

    const specifications = parseSpecifications(p.specifications);

    const response = successResponse({
      id: p.id,
      uniqId: p.uniqId,
      pid: p.pid,
      name: p.productName,
      productUrl: p.productUrl,
      category: p.category,
      categoryTree: p.categoryTree,
      retailPrice: p.retailPrice,
      price: p.discountedPrice || p.retailPrice || null,
      originalPrice: p.retailPrice || null,
      image: p.image || images[0] || null,
      images,
      description: p.description,
      rating: p.productRating || p.overallRating,
      productRating: p.productRating,
      overallRating: p.overallRating,
      brand: p.brand,
      specifications,
      isFKAdvantage: p.isFKAdvantage,
      crawlTimestamp: p.crawlTimestamp,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    });

    // Cache the response
    await setCachedProductDetail(id, response);

    return res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const appError = AppError.BadRequest("Invalid product ID");
      return res.status(appError.statusCode).json(errorResponse(appError));
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error));
    }
    throw error;
  }
});

/**
 * GET /products/categories/list
 * Get all unique product categories
 */
router.get("/categories/list", async (req: Request, res: Response) => {
  try {
    // Try to get from cache
    const cached = await getCachedCategories();
    if (cached) {
      // Handle both old format (array) and new format (response object)
      if (Array.isArray(cached)) {
        // Old cache format - wrap it in response structure
        const response = successResponse({ categories: cached });
        return res.json(response);
      }
      // New cache format - return as is
      return res.json(cached);
    }

    const categories = await prisma.$queryRawUnsafe<Array<{ category: string }>>(
      `SELECT DISTINCT category FROM "Product" WHERE category IS NOT NULL ORDER BY category`,
    );

    const categoryList = categories.map((c) => c.category);
    const response = successResponse({
      categories: categoryList,
    });

    // Cache the full response structure
    await setCachedCategories(response);

    return res.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error));
    }
    throw error;
  }
});

/**
 * GET /products/brands/list
 * Get all unique product brands
 */
router.get("/brands/list", async (req: Request, res: Response) => {
  try {
    // Try to get from cache
    const cached = await getCachedBrands();
    if (cached) {
      // Handle both old format (array) and new format (response object)
      if (Array.isArray(cached)) {
        // Old cache format - wrap it in response structure
        const response = successResponse({ brands: cached });
        return res.json(response);
      }
      // New cache format - return as is
      return res.json(cached);
    }

    const brands = await prisma.$queryRawUnsafe<Array<{ brand: string }>>(
      `SELECT DISTINCT brand FROM "Product" WHERE brand IS NOT NULL ORDER BY brand`,
    );

    const brandList = brands.map((b) => b.brand);
    const response = successResponse({
      brands: brandList,
    });

    // Cache the full response structure
    await setCachedBrands(response);

    return res.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error));
    }
    throw error;
  }
});

export default router;
