// Sesión de admin: cookie httpOnly firmada con HMAC-SHA256 (Web Crypto, compatible con el runtime Edge de middleware.ts).
// No hay tabla de usuarios: una sola contraseña compartida (ADMIN_PASSWORD) desbloquea la cookie.

export const ADMIN_COOKIE = "eden_admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Falta SESSION_SECRET en las variables de entorno");
  return secret;
}

async function getKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  new Uint8Array(bytes).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + ADMIN_COOKIE_MAX_AGE * 1000;
  const payload = String(exp);
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  try {
    const key = await getKey();
    return await crypto.subtle.verify("HMAC", key, fromBase64Url(sig), new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}
