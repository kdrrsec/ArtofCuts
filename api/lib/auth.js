import crypto from "crypto";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function getPortalPassword() {
  return process.env.PORTAL_PASSWORD || "Ronaldo7";
}

function getSecret() {
  return process.env.PORTAL_SECRET || getPortalPassword();
}

export function verifyPortalPassword(password) {
  return password === getPortalPassword();
}

export function createPortalToken() {
  const payload = {
    role: "portal",
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyPortalToken(token) {
  if (!token) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  if (signature !== expected) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.role === "portal" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}
