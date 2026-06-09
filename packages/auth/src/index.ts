import type { Category } from "@blocksite/core";
import { auth as authRepo } from "@blocksite/storage";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return timingSafeEqual(inputHash, storedHash);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function setCategoryPassword(category: Category, password: string): Promise<void> {
  const hash = await hashPassword(password);
  await authRepo.setHash(category, hash);
}

export async function removeCategoryPassword(category: Category): Promise<void> {
  await authRepo.removeHash(category);
}

export async function verifyCategoryPassword(
  category: Category,
  password: string,
): Promise<boolean> {
  const hash = await authRepo.getHash(category);
  if (hash === undefined) return true; // No password set = no verification needed
  return verifyPassword(password, hash);
}

export async function hasPassword(category: Category): Promise<boolean> {
  const hash = await authRepo.getHash(category);
  return hash !== undefined;
}
