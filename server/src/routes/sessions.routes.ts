import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getUserSessions,
  revokeSession,
  revokeAllSessions,
} from "../services/session.service";

const router = Router();
router.use(authMiddleware);

// Obtener todas las sesiones activas del usuario
router.get("/", async (req: Request, res: Response) => {
  try {
    const sessions = await getUserSessions(req.userId!);
    res.json(sessions);
  } catch (err) {
    console.error("[sessions/get]", err);
    res.status(500).json({ error: "Error al obtener las sesiones." });
  }
});

// Revocar una sesión específica
router.delete("/:sessionId", async (req: Request, res: Response) => {
  try {
    await revokeSession(String(req.params.sessionId), req.userId!);
    res.json({ ok: true });
  } catch (err) {
    console.error("[sessions/delete]", err);
    res.status(500).json({ error: "Error al revocar la sesión." });
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
