import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  FRONTEND_URL_VERCEL: z.string().url().optional(),
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  MAX_PRODUCT_ITEMS: z.coerce.number().int().positive().default(7),
  MAX_KNOWLEDGE_BASE_SEARCH_ITEMS: z.coerce.number().int().positive().default(5),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((issue) => issue.path.join(".")).join(", ");
      throw new Error(`Invalid environment variables: ${missingVars}\n${error.message}`);
    }
    throw error;
  }
}

export const env = getEnv();
