import { z } from "zod";

// Trimmed, length-capped text. React escapes output, so sanitising here means
// normalising whitespace and stripping control characters rather than HTML-encoding.
export const text = (max = 200) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max, `Must be ${max} characters or fewer`));

export const requiredText = (label: string, max = 200) =>
  text(max).pipe(z.string().min(1, `${label} is required`));

export const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Password needs a letter")
  .regex(/[0-9]/, "Password needs a number");

export const id = z.string().min(1).max(64).regex(/^[a-z0-9_]+$/i, "Invalid id");
export const ids = z.array(id).max(5000);

export const domainName = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/, "Enter a valid domain like acme.com");
