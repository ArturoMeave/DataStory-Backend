import { Router, type Request, type Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import type { APIError } from "../types";

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
    res.json(result);
  } catch (err) {
    const error: APIError = {
      error: err instanceof Error ? err.message : "Error al iniciar sesión.",
    };
    res.status(401).json(error);
  }
});

export default router;
