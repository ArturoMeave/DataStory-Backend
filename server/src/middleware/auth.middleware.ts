import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      sessionId?: string;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autorizado. Token no proporcionado." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.sessionId = decoded.sessionId;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado." });
  }
}
