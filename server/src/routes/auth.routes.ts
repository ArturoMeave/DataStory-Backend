import { Router, type Request, type Response } from "express";
import {
  registerUser,
  loginUser,
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  generateToken,
  update2FAFrequency,
} from "../services/auth.service";
import { authMiddleware } from "../middleware/auth.middleware";
import { PrismaClient } from "@prisma/client";
import type { APIError } from "../types";

const prisma = new PrismaClient();
const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    const error: APIError = { error: "Email y contraseña son obligatorios." };
    res.status(400).json(error);
    return;
  }

  if (password.length < 6) {
    const error: APIError = {
      error: "La contraseña debe tener al menos 6 caracteres.",
    };
    res.status(400).json(error);
    return;
  }

  try {
    const result = await registerUser(email, password, name);
    res.status(201).json(result);
  } catch (err) {
    const error: APIError = {
      error: err instanceof Error ? err.message : "Error al registrar.",
    };
    res.status(400).json(error);
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const error: APIError = { error: "Email y contraseña son obligatorios." };
    res.status(400).json(error);
    return;
  }

  try {
    const result = await loginUser(email, password);
    // result ya contiene { requiresTwoFactor: true, userId: '...' } si el 2FA está encendido,
    // o { token, user } si entra de forma clásica.
    res.json(result); 
  } catch (err) {
    const error: APIError = {
      error: err instanceof Error ? err.message : "Error al iniciar sesión.",
    };
    res.status(401).json(error);
  }
});

router.post("/login/verify-2fa", async (req: Request, res: Response) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    const error: APIError = { error: "Faltan datos para validar 2FA." };
    res.status(400).json(error);
    return;
  }

  try {
    const user = await verifyTwoFactorToken(userId, token);
    
    const frequencyDays: Record<string, number> = { "7d": 7, "15d": 15, "30d": 30 };
    const days = frequencyDays[(user as any).twoFactorFrequency];
    const trustedUntil = days
      ? Math.floor(Date.now() / 1000) + days * 24 * 60 * 60
      : undefined;

    const jwtToken = generateToken(user.id, user.email, trustedUntil);
    
    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        twoFactorFrequency: (user as any).twoFactorFrequency,
      }
    });
  } catch (err) {
    const error: APIError = {
      error: err instanceof Error ? err.message : "Código 2FA inválido.",
    };
    res.status(401).json(error);
  }
});

// ===================================
// RUTAS PROTEGIDAS (Ajustes de Sesión)
// ===================================
router.use(authMiddleware);

router.post("/2fa/generate", async (req: Request, res: Response) => {
  try {
    // Obtenemos userId y email directamente del token gracias al authMiddleware
    const result = await generateTwoFactorSecret(req.userId!, req.userEmail!);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Error al generar 2FA" });
  }
});

router.post("/2fa/enable", async (req: Request, res: Response) => {
  const { token, frequency = "always" } = req.body;

  if (!token) {
    res.status(400).json({ error: "Falta el token 2FA para habilitarlo." });
    return;
  }

  try {
    // Simulacro: comprobamos que el usuario ligó bien su teléfono
    const user = await verifyTwoFactorToken(req.userId!, token);

    // Guardamos la frecuencia elegida y activamos el candado
    await prisma.user.update({
      where: { id: req.userId! },
      data: { 
        isTwoFactorEnabled: true, 
        twoFactorFrequency: frequency 
      } as any, 
    });

    // Calculamos cuándo expira la "confianza" para incluirlo en el JWT
    const frequencyDays: Record<string, number> = { "7d": 7, "15d": 15, "30d": 30 };
    const days = frequencyDays[frequency];
    const trustedUntil = days
      ? Math.floor(Date.now() / 1000) + days * 24 * 60 * 60
      : undefined;

    // Emitimos el JWT definitivo con la fecha de confianza dentro del payload
    const jwtToken = generateToken(user.id, user.email, trustedUntil);

    res.json({ ok: true, message: "2FA habilitado correctamente.", token: jwtToken });
  } catch (err) {
    const error: APIError = {
      error: err instanceof Error ? err.message : "Error al habilitar 2FA.",
    };
    res.status(400).json(error);
  }
});

router.post("/2fa/update-frequency", async (req: Request, res: Response) => {
  const { token, frequency } = req.body;

  if (!token || !frequency) {
    res.status(400).json({ error: "Faltan el código o la frecuencia." });
    return;
  }

  try {
    await update2FAFrequency(req.userId!, token, frequency);
    res.json({ ok: true, message: "Frecuencia actualizada correctamente." });
  } catch (err) {
    const error: APIError = {
      error: err instanceof Error ? err.message : "Error al actualizar la frecuencia.",
    };
    res.status(400).json(error);
  }
});

export default router;
