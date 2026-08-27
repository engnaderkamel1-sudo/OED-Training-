/**
 * Security Utility for Password Hashing and Verification
 * Uses standard Web Crypto API (SHA-256) with application-level salting.
 */

const SALT = "oed_training_management_system_salt_2026_secure";

/**
 * Generates a salted SHA-256 hexadecimal hash from a plaintext string.
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText) return "";
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${SALT}:${plainText.trim()}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.error("Crypto hashing error:", err);
    // Simple fallback if subtle crypto is unavailable in legacy context
    let hash = 0;
    const str = `${SALT}:${plainText.trim()}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `fb_${Math.abs(hash)}`;
  }
}

/**
 * Verifies a plaintext password against a stored value.
 * Supports both legacy plaintext (for automatic upgrade) and salted SHA-256 hashes.
 */
export async function verifyPassword(plainInput: string, storedHashOrPlain?: string): Promise<boolean> {
  if (!plainInput || !storedHashOrPlain) return false;
  const trimmedInput = plainInput.trim();
  
  // 1. Direct match (Backward compatibility for legacy unhashed plain-text accounts)
  if (storedHashOrPlain === trimmedInput) {
    return true;
  }

  // 2. Cryptographic SHA-256 Hash match
  try {
    const hashedInput = await hashPassword(trimmedInput);
    return hashedInput === storedHashOrPlain;
  } catch {
    return false;
  }
}

/**
 * Removes the password field from a user object before caching in localStorage.
 */
export function sanitizeUserForStorage<T extends Record<string, any>>(userObj: T): Omit<T, 'password'> {
  if (!userObj) return userObj;
  const { password, ...safeUser } = userObj;
  return safeUser;
}
