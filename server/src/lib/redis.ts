import Redis from "ioredis";
import { env } from "@/env";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

redis.on("connect", () => {
  console.log("🔌 Redis connecting...");
});

redis.on("ready", () => {
  console.log("✅ Redis connected and ready");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

redis.on("close", () => {
  console.log("🔌 Redis connection closed");
});

export async function testRedisConnection() {
  try {
    await redis.ping();
    console.log("✅ Redis connection test passed");
    return true;
  } catch (error) {
    console.error("❌ Redis connection test failed:", error);
    return false;
  }
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await redis.quit();
});
