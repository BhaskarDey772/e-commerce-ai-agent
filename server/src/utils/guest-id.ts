import { type Request, type Response } from "express";

const GUEST_ID_COOKIE_NAME = "spur_guest_id";
const GUEST_ID_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

function generateGuestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
}

export function getOrCreateGuestId(req: Request, res: Response): string {
  let guestId = req.cookies[GUEST_ID_COOKIE_NAME];

  if (!guestId || typeof guestId !== "string" || guestId.trim().length === 0) {
    guestId = generateGuestId();

    res.cookie(GUEST_ID_COOKIE_NAME, guestId, {
      maxAge: GUEST_ID_COOKIE_MAX_AGE,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  return guestId;
}

export function getGuestId(req: Request): string | null {
  const guestId = req.cookies[GUEST_ID_COOKIE_NAME];
  return guestId && typeof guestId === "string" && guestId.trim().length > 0 ? guestId : null;
}
