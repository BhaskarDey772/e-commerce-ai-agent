import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { env } from "@/env";
import { AppError } from "@/lib/error";
import { testDatabaseConnection } from "@/lib/prisma";
import { testRedisConnection } from "@/lib/redis";
import { errorResponse, successResponse } from "@/lib/response";
import chatRoutes from "@/routes/chat";
import imageRoutes from "@/routes/images";
import productRoutes from "@/routes/products";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173", env.FRONTEND_URL].filter((url): url is string => !!url),
    credentials: true,
  }),
);

// Root route
app.get("/", (_req: Request, res: Response) => {
  res.json(successResponse({ message: "Welcome to Spur API" }));
});

// Health check route
app.get("/health", (_req: Request, res: Response) => {
  res.json(successResponse({ status: "ok", timestamp: new Date().toISOString() }));
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  next();
});

// Routes
app.use("/chat", chatRoutes);
app.use("/products", productRoutes);
app.use("/api/images", imageRoutes);

// 404 handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  throw AppError.NotFound("Route not found");
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Handle AppError instances
  if (err instanceof AppError) {
    const response = errorResponse(err);
    return res.status(err.statusCode).json(response);
  }

  // Handle unexpected errors
  console.error("Unexpected error:", err);
  const unexpectedError = AppError.InternalServerError(
    env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
  );
  const response = errorResponse(unexpectedError);
  res.status(500).json(response);
});

// Start server
const server = app.listen(env.PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📦 Environment: ${env.NODE_ENV}`);
  console.log(""); // Empty line for readability

  // Test connections
  await testDatabaseConnection();
  await testRedisConnection();
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
