import type { Request, Response } from "express";
import { AppError } from "@/lib/error";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "session_id";
const SESSION_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 365; // 1 year

/**
 * Get or create a session for the current request
 */
export async function getOrCreateSession(req: Request, res: Response): Promise<string> {
  const sessionId = req.cookies[SESSION_COOKIE_NAME];

  // Validate existing session
  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (session) {
      return sessionId;
    }
    // Session doesn't exist, create a new one
  }

  // Create new session
  const session = await prisma.session.create({
    data: {},
  });

  // Set cookie
  res.cookie(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
  });

  return session.id;
}

/**
 * Get session ID from request (without creating if missing)
 */
export function getSessionId(req: Request): string | undefined {
  return req.cookies[SESSION_COOKIE_NAME];
}

/**
 * Validate session exists
 */
export async function validateSession(sessionId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  return !!session;
}
