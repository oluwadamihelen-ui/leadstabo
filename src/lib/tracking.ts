import "server-only";
import { createHmac } from "crypto";
import { safeEqual } from "@/lib/crypto";

// Open/click tracking URLs. APP_URL must be publicly reachable for recipients' mail clients to hit them.
const base = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

function sign(value: string) {
  return createHmac("sha256", `track:${process.env.APP_SECRET}`).update(value).digest("base64url").slice(0, 22);
}

export function openPixelUrl(emailId: string) {
  return `${base()}/api/t/o/${emailId}`;
}

export function clickUrl(emailId: string, target: string) {
  return `${base()}/api/t/c/${emailId}?u=${encodeURIComponent(target)}&s=${sign(`${emailId}|${target}`)}`;
}

/** Only redirects to URLs we signed, so the endpoint can't be used as an open redirect. */
export function verifyClick(emailId: string, target: string, sig: string) {
  return /^https?:\/\//.test(target) && safeEqual(sign(`${emailId}|${target}`), sig);
}
