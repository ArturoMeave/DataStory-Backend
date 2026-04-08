import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getUserSessions,
  revokeSessionWithVerification,
  revokeAllSessions,
} from "../services/session.service";

const router = Router();
router.use(authMiddleware);

// Obtener todas las sesiones activas
router.get("/", async (req: Request, res: Response) => {
  try {
    const sessions = await getUserSessions(req.userId!);
    // Marcamos cuál es la sesión actual usando el sessionId del JWT
    const currentSessionId = (req as any).sessionId;
    const sessionsWithCurrent = sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentSessionId,
    }));
    res.json(sessionsWithCurrent);
  } catch (err) {
    console.error("[sessions/get]", err);
    res.status(500).json({ error: "Error al obtener las sesiones." });
  }
});

// Revocar una sesión con verificación de contraseña
router.delete("/:sessionId", async (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    res
      .status(400)
      .json({ error: "La contraseña es obligatoria para revocar una sesión." });
    return;
  }

  try {
    await revokeSessionWithVerification(
      String(req.params.sessionId),
      req.userId!,
      password,
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("[sessions/delete]", err);
    res.status(400).json({
      error: err instanceof Error ? err.message : "Error al revocar la sesión.",
    });
  }
});

// Cerrar todas las demás sesiones
router.delete("/", async (req: Request, res: Response) => {
  try {
    const currentToken = req.headers.authorization?.split(" ")[1];
    await revokeAllSessions(req.userId!, currentToken);
    res.json({ ok: true });
  } catch (err) {
    console.error("[sessions/delete-all]", err);
    res.status(500).json({ error: "Error al revocar las sesiones." });
  }
});

export default router;
