import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { AppError, errorResponse, prisma, successResponse } from "@/lib";
import {
  getCachedBrands,
  getCachedCategories,
  getCachedProductDetail,
  getCachedProducts,
  parseSpecifications,
  setCachedBrands,
  setCachedCategories,
  setCachedProductDetail,
  setCachedProducts,
} from "@/utils";
import type { FormattedProduct, ProductRow, SearchProductRow } from "@/types";

const router = Router();

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

const PRODUCT_SELECT_FIELDS = `
  id, "uniqId", pid, "productName", "productUrl", category, "categoryTree",
  "retailPrice", "discountedPrice", image, images, description,
  "productRating", "overallRating", brand, specifications,
  "isFKAdvantage", "crawlTimestamp", "createdAt", "updatedAt"
`;

const SEARCH_SELECT_FIELDS = `
  id, "uniqId", "productName", category, "discountedPrice", "retailPrice",
  image, images, description, "productRating", "overallRating", brand
`;

function parseImages(imagesStr: string | null): string[] {
  if (!imagesStr) return [];
  try {
    return JSON.parse(imagesStr);
  } catch {
    return [];
  }
}

function formatProduct(product: ProductRow): FormattedProduct {
  const images = parseImages(product.images);

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
    specifications: parseSpecifications(product.specifications),
    isFKAdvantage: product.isFKAdvantage,
    crawlTimestamp: product.crawlTimestamp,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function formatSearchProduct(product: SearchProductRow) {
  const images = parseImages(product.images);

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
}

function buildWhereClause(queryParams: z.infer<typeof productQuerySchema>): {
  clause: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];
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

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

function buildOrderBy(sortBy: string): string {
  const orderByMap: Record<string, string> = {
    price_asc: `ORDER BY "discountedPrice" ASC NULLS LAST`,
    price_desc: `ORDER BY "discountedPrice" DESC NULLS LAST`,
    rating_desc: `ORDER BY COALESCE("productRating", "overallRating", 0) DESC NULLS LAST`,
    name_asc: `ORDER BY "productName" ASC`,
    name_desc: `ORDER BY "productName" DESC`,
    newest: `ORDER BY "createdAt" DESC`,
  };

  const defaultOrder = `ORDER BY "createdAt" DESC`;
  return orderByMap[sortBy] ?? defaultOrder;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const queryParams = productQuerySchema.parse(req.query);

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

    const { clause: whereClause, params: whereParams } = buildWhereClause(queryParams);
    const orderBy = buildOrderBy(queryParams.sortBy || "newest");

    const productsQuery = `
      SELECT ${PRODUCT_SELECT_FIELDS}
      FROM "Product"
      ${whereClause}
      ${orderBy}
      LIMIT $${whereParams.length + 1}
      OFFSET $${whereParams.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM "Product"
      ${whereClause}
    `;

    const [products, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe<ProductRow[]>(productsQuery, ...whereParams, limit, skip),
      prisma.$queryRawUnsafe<Array<{ count: number }>>(countQuery, ...whereParams),
    ]);

    const total = totalResult[0]?.count || 0;
    const formattedProducts = products.map(formatProduct);

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

router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = z
      .string()
      .min(1)
      .max(500)
      .parse(req.query.q || req.query.query);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const results = await prisma.$queryRawUnsafe<SearchProductRow[]>(
      `
      SELECT ${SEARCH_SELECT_FIELDS}
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

    const formattedResults = results.map(formatSearchProduct);

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

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = productIdSchema.parse({ id: req.params.id });

    const product = await prisma.$queryRawUnsafe<ProductRow[]>(
      `SELECT ${PRODUCT_SELECT_FIELDS}
       FROM "Product" 
       WHERE id = $1 
       LIMIT 1`,
      id,
    );

    if (product.length === 0 || !product[0]) {
      throw AppError.NotFound("Product not found");
    }

    const response = successResponse(formatProduct(product[0]));

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

router.get("/categories/list", async (req: Request, res: Response) => {
  try {
    const cached = await getCachedCategories();
    if (cached) {
      if (Array.isArray(cached)) {
        return res.json(successResponse({ categories: cached }));
      }
      return res.json(cached);
    }

    const categories = await prisma.$queryRawUnsafe<Array<{ category: string }>>(
      `SELECT DISTINCT category FROM "Product" WHERE category IS NOT NULL ORDER BY category`,
    );

    const categoryList = categories.map((c) => c.category);
    const response = successResponse({ categories: categoryList });

    await setCachedCategories(response);
    return res.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error));
    }
    throw error;
  }
});

router.get("/brands/list", async (req: Request, res: Response) => {
  try {
    const cached = await getCachedBrands();
    if (cached) {
      if (Array.isArray(cached)) {
        return res.json(successResponse({ brands: cached }));
      }
      return res.json(cached);
    }

    const brands = await prisma.$queryRawUnsafe<Array<{ brand: string }>>(
      `SELECT DISTINCT brand FROM "Product" WHERE brand IS NOT NULL ORDER BY brand`,
    );

    const brandList = brands.map((b) => b.brand);
    const response = successResponse({ brands: brandList });

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
