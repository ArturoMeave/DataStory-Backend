import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  saveSnapshot,
  getSnapshotById,
  getSnapshotsHistory,
  saveUserAlertConfig,
  getUserAlertConfig,
  deleteSnapshot,
} from "../services/snapshot.service";
import type { APIError } from "../types";

const router = Router();

// ============================================================================
// VENTANILLA PÚBLICA (Afuera, sin Guardia de Seguridad)
// ============================================================================
router.get("/share/:id", async (req: Request, res: Response) => {
  try {
    const snapshot = await getSnapshotById(req.params.id as string);
    if (!snapshot) {
      res.status(404).json({ error: "Este dashboard no existe o expiró." });
      return;
    }
    res.json(snapshot);
  } catch (err) {
    console.error("[snapshots/share]", err);
    res.status(500).json({ error: "Error de apertura al compartir." });
  }
});

// ============================================================================
// A PARTIR DE AQUÍ EL GUARDIA PIDE GAFETE Y LLAVE (Middleware Activo)
// ============================================================================
router.use(authMiddleware);

router.post("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const body = req.body;

  try {
    const snapshot = await saveSnapshot(
      {
        totalRevenue: body.totalRevenue,
        totalExpenses: body.totalExpenses,
        netProfit: body.netProfit ?? body.totalRevenue - body.totalExpenses,
        periodCount: body.periodCount ?? 0,
        anomalyCount: body.anomalyCount ?? 0,
        goalAmount: body.goalAmount,
        aiSummary: body.aiSummary,
        recentPeriods: body.recentPeriods ?? [],
      },
      userId,
    );

    res.status(201).json({ ok: true, id: snapshot.id });
  } catch (err) {
    console.error("[snapshots/post]", err);
    res
      .status(500)
      .json({ error: "Error al guardar el snapshot." } as APIError);
  }
});

// Este es el Endpoint que usará nuestro HistoryPage que hicimos en Frontend
router.get("/me", async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const snapshots = await getSnapshotsHistory(userId);
    res.json(snapshots);
  } catch (err) {
    console.error("[snapshots/me]", err);
    res
      .status(500)
      .json({ error: "Error al recuperar el historial." } as APIError);
  }
});

// -- Configuración de alertas normal (Mantener igual) --
router.post("/config", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { email, enableAnomalyAlerts, enableDailyDigest } = req.body;
  try {
    const config = await saveUserAlertConfig({
      userId,
      email,
      enableAnomalyAlerts: enableAnomalyAlerts ?? true,
      enableDailyDigest: enableDailyDigest ?? false,
    });
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar la config." });
  }
});

router.get("/config", async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const config = await getUserAlertConfig(userId);
    if (!config) {
      res.status(404).json({ error: "No tienes configuración." });
      return;
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Error al cargar la config." });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    // Añadimos "as string" para confirmar que es un texto único
    await deleteSnapshot(req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[snapshots/delete]", err.message);
    res.status(500).json({ error: "Error al eliminar el snapshot." });
  }
});

export default router;
