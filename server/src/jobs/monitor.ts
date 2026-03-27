import cron from "node-cron";
import { getAllSnapshots, getAllUserConfigs } from "../storage/store";
import { sendAnomalyAlert, sendDailyDigest } from "../services/email.service";

export async function runMonitor(): Promise<void> {
  console.log(`[monitor] Ejecutando revisión: ${new Date().toISOString()}`);

  const snapshots = getAllSnapshots();
  const userConfigs = getAllUserConfigs();

  if (snapshots.length === 0) {
    console.log("[monitor] No hay snapshots guardados. Nada que revisar.");
    return;
  }

  const configByUser = new Map(
    userConfigs.map((config) => [config.userId, config]),
  );

  let alertsSent = 0;

  for (const snapshot of snapshots) {
    const config = configByUser.get(snapshot.userId);

    if (!config) {
      console.log(
        `[monitor] Usuario ${snapshot.userId} sin configuración de alertas. Omitiendo.`,
      );
      continue;
    }

    try {
      if (config.enableAnomalyAlerts && snapshot.anomalyCount > 0) {
        await sendAnomalyAlert(config.email, snapshot);
        console.log(`[monitor] Alerta de anomalía enviada a ${config.email}`);
        alertsSent++;
      }

      if (config.enableDailyDigest) {
        await sendDailyDigest(config.email, snapshot);
        console.log(`[monitor] Resumen diario enviado a ${config.email}`);
        alertsSent++;
      }
    } catch (err) {
      console.error(`[monitor] Error enviando email a ${config.email}:`, err);
    }
  }

  console.log(`[monitor] Revisión completada. Emails enviados: ${alertsSent}`);
}

export function startCronJobs(): void {
  // "0 8 * * *" = todos los días a las 8:00
  cron.schedule("0 8 * * *", async () => {
    await runMonitor();
  });

  console.log("[monitor] Cron job programado: todos los días a las 8:00");
}
