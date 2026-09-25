import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";

function secret() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) throw new Error("APP_SECRET must be set to at least 32 characters");
  return s;
}

function key() {
  return createHash("sha256").update(`enc:${secret()}`).digest();
}

/** AES-256-GCM. Output: base64(iv | tag | ciphertext). Used for provider credentials & 2FA secrets. */
export function encrypt(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

export function decrypt(payload: string) {
  const buf = Buffer.from(payload, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
