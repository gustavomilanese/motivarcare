import { config } from "dotenv";
import crypto from "node:crypto";

config();

const secret = process.env.JWT_SECRET || "dev-only-change-me";
const userId = process.argv[2];
const email = process.argv[3];
const role = process.argv[4] || "PATIENT";
if (!userId || !email) {
  console.error("usage: node scripts/_smoke-mint-token.mjs <userId> <email> [role]");
  process.exit(1);
}
const now = Math.floor(Date.now() / 1000);
const payload = { userId, role, email, iat: now, exp: now + 60 * 60 };
const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
console.log(`${encoded}.${signature}`);
