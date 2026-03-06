import { Router } from "express";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["PATIENT", "PROFESSIONAL", "ADMIN"])
});

export const authRouter = Router();

authRouter.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  // TODO: Persistir usuario y hash de password.
  return res.status(201).json({
    message: "User registration scaffold ready",
    user: { email: parsed.data.email, fullName: parsed.data.fullName, role: parsed.data.role }
  });
});

authRouter.post("/login", (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid credentials payload" });
  }

  // TODO: validar credenciales reales + JWT.
  return res.json({ message: "Login scaffold ready", token: "replace-with-jwt" });
});
