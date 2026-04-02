import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  saveSnapshot,
  getSnapshot,
  saveUserConfig,
  getUserConfig,
} from "../storage/store";
import type { DataSnapshot, UserAlertConfig, APIError } from "../types";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as Partial<DataSnapshot>;

  // Usamos el userId del token JWT, no el que envía el frontend
  const userId = req.userId!;

  if (body.totalRevenue === undefined || body.totalExpenses === undefined) {
    const error: APIError = {
      error: "Los campos totalRevenue y totalExpenses son obligatorios.",
    };
    res.status(400).json(error);
    return;
  }

  const snapshot: DataSnapshot = {
    id: uuidv4(),
    userId,
    createdAt: Date.now(),
    totalRevenue: body.totalRevenue,
    totalExpenses: body.totalExpenses,
    netProfit: body.totalRevenue - body.totalExpenses,
    periodCount: body.periodCount ?? 0,
    anomalyCount: body.anomalyCount ?? 0,
    recentPeriods: body.recentPeriods ?? [],
    ...(body.goalAmount !== undefined && { goalAmount: body.goalAmount }),
    ...(body.aiSummary && { aiSummary: body.aiSummary }),
  };

  saveSnapshot(snapshot);
  res.status(201).json({ ok: true, id: snapshot.id });
});

router.get("/me", (req: Request, res: Response) => {
  const userId = req.userId!;

  const snapshot = getSnapshot(userId);

  if (!snapshot) {
    res
      .status(404)
      .json({ error: "No se encontró ningún snapshot para este usuario." });
    return;
  }

  res.json(snapshot);
});

import { runMonitor } from "../jobs/monitor";

router.post("/admin/run-monitor", async (_req, res: Response) => {
  try {
    await runMonitor();
    res.json({ ok: true, message: "Monitor ejecutado correctamente." });
  } catch (err) {
    res.status(500).json({ error: "Error al ejecutar el monitor." });
  }
});

export default router;
