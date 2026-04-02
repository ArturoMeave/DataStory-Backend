import cron from "node-cron";
import {
  getAllSnapshots,
  getAllUserAlertConfigs,
} from "../services/snapshot.service";
import { sendAnomalyAlert, sendDailyDigest } from "../services/email.service";
import type { UserAlertConfig } from "../types";

export async function runMonitor(): Promise<void> {
  console.log(`[monitor] Ejecutando revisión: ${new Date().toISOString()}`);

  const snapshots = await getAllSnapshots();
  const userConfigs = await getAllUserAlertConfigs();

  if (snapshots.length === 0) {
    console.log("[monitor] No hay snapshots guardados. Nada que revisar.");
    return;
  }

  const configByUser = new Map<string, UserAlertConfig>(
    userConfigs.map((config) => [config.userId, config]),
  );

  let alertsSent = 0;

  for (const snapshot of snapshots) {
    const config = configByUser.get(snapshot.userId);
    if (!config) continue;

    try {
      if (config.enableAnomalyAlerts && snapshot.anomalyCount > 0) {
        await sendAnomalyAlert(config.email, snapshot);
        alertsSent++;
        console.log(`[monitor] Alerta enviada a ${config.email}`);
      }

      if (config.enableDailyDigest) {
        await sendDailyDigest(config.email, snapshot);
        alertsSent++;
        console.log(`[monitor] Resumen diario enviado a ${config.email}`);
      }
    } catch (err) {
      console.error(`[monitor] Error enviando email a ${config.email}:`, err);
    }
  }

  console.log(`[monitor] Revisión completada. Emails enviados: ${alertsSent}`);
}

export function startCronJobs(): void {
  cron.schedule("0 8 * * *", async () => {
    await runMonitor();
  });
  console.log("[monitor] Cron job programado: todos los días a las 8:00");
}
