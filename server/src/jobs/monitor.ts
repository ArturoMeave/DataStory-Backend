import cron from "node-cron";
import {
  getAllSnapshots,
  getAllUserAlertConfigs,
} from "../services/snapshot.service";
import { sendAnomalyAlert, sendDailyDigest } from "../services/email.service";
import type { UserAlertConfig } from "../types";

export async function runMonitor(): Promise<void> {

  const snapshots = await getAllSnapshots();
  const userConfigs = await getAllUserAlertConfigs();

  if (snapshots.length === 0) {
    return;
  }

  const configByUser = new Map<string, UserAlertConfig>(
    userConfigs.map((config: UserAlertConfig) => [config.userId, config]),
  );

  let alertsSent = 0;

  for (const snapshot of snapshots) {
    const config = configByUser.get(snapshot.userId);
    if (!config) continue;

    try {
      if (config.enableAnomalyAlerts && snapshot.anomalyCount > 0) {
        await sendAnomalyAlert(config.email, snapshot);
        alertsSent++;
      }

      if (config.enableDailyDigest) {
        await sendDailyDigest(config.email, snapshot);
        alertsSent++;
      }
    } catch (err) {
      console.error(`[monitor] Error enviando email a ${config.email}:`, err);
    }
  }

}

export function startCronJobs(): void {
  cron.schedule("0 8 * * *", async () => {
    await runMonitor();
  });
}
