import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  saveSnapshot,
  getSnapshot,
  saveUserAlertConfig,
  getUserAlertConfig,
} from "../services/snapshot.service";
import { runMonitor } from "../jobs/monitor";
import type { APIError } from "../types";

const router = Router();
router.use(authMiddleware);

router.post("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const body = req.body;

  if (body.recentPeriods !== undefined && !Array.isArray(body.recentPeriods)) {
    const error: APIError = {
      error: "El campo recentPeriods debe ser un array.",
    };
    res.status(400).json(error);
    return;
  }

  if (body.totalRevenue === undefined || body.totalExpenses === undefined) {
    const error: APIError = {
      error: "Los campos totalRevenue y totalExpenses son obligatorios.",
    };
    res.status(400).json(error);
    return;
  }

  if (body.totalRevenue < 0 || body.totalExpenses < 0) {
    const error: APIError = {
      error: "Los valores de ingresos y gastos no pueden ser negativos.",
    };
    res.status(400).json(error);
    return;
  }

  if (body.periodCount !== undefined && body.periodCount < 0) {
    const error: APIError = {
      error: "El número de períodos no puede ser negativo.",
    };
    res.status(400).json(error);
    return;
  }

  try {
    const snapshot = await saveSnapshot({
      userId,
      totalRevenue: body.totalRevenue,
      totalExpenses: body.totalExpenses,
      netProfit: body.totalRevenue - body.totalExpenses,
      periodCount: body.periodCount ?? 0,
      anomalyCount: body.anomalyCount ?? 0,
      goalAmount: body.goalAmount,
      aiSummary: body.aiSummary,
      recentPeriods: body.recentPeriods ?? [],
    });

    res.status(201).json({ ok: true, id: snapshot.id });
  } catch (err) {
    console.error("[snapshots/post]", err);
    const error: APIError = { error: "Error al guardar el snapshot." };
    res.status(500).json(error);
  }
});

router.get("/me", async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const snapshot = await getSnapshot(userId);

    if (!snapshot) {
      res
        .status(404)
        .json({ error: "No se encontró ningún snapshot para este usuario." });
      return;
    }

    res.json(snapshot);
  } catch (err) {
    console.error("[snapshots/me]", err);
    const error: APIError = { error: "Error al recuperar el snapshot." };
    res.status(500).json(error);
  }
});

router.post("/config", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { email, enableAnomalyAlerts, enableDailyDigest } = req.body;

  if (!email) {
    const error: APIError = {
      error: "El email es obligatorio para configurar las alertas.",
    };
    res.status(400).json(error);
    return;
  }

  try {
    const config = await saveUserAlertConfig({
      userId,
      email,
      enableAnomalyAlerts: enableAnomalyAlerts ?? true,
      enableDailyDigest: enableDailyDigest ?? false,
    });

    res.json({ ok: true, config });
  } catch (err) {
    console.error("[snapshots/config]", err);
    const error: APIError = { error: "Error al guardar la configuración." };
    res.status(500).json(error);
  }
});

router.get("/config", async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const config = await getUserAlertConfig(userId);

    if (!config) {
      res
        .status(404)
        .json({ error: "No tienes configuración de alertas todavía." });
      return;
    }

    res.json(config);
  } catch (err) {
    console.error("[snapshots/config/get]", err);
    const error: APIError = { error: "Error al recuperar la configuración." };
    res.status(500).json(error);
  }
});

router.post("/admin/run-monitor", async (req: Request, res: Response) => {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (req.userEmail !== adminEmail) {
    res
      .status(403)
      .json({ error: "No tienes permisos para ejecutar esta acción." });
    return;
  }

  try {
    await runMonitor();
    res.json({ ok: true, message: "Monitor ejecutado correctamente." });
  } catch (err) {
    console.error("[admin/run-monitor]", err);
    res.status(500).json({ error: "Error al ejecutar el monitor." });
  }
});

export default router;
