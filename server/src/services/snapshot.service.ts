import { PrismaClient, Snapshot } from "@prisma/client";
import type { DataSnapshot, UserAlertConfig } from "../types";

const prisma = new PrismaClient();

// Convierte un objeto de Prisma al tipo DataSnapshot de nuestra app
function toDataSnapshot(record: Snapshot): DataSnapshot {
  return {
    id: record.id,
    userId: record.userId,
    createdAt: new Date(record.createdAt).getTime(),
    totalRevenue: record.totalRevenue,
    totalExpenses: record.totalExpenses,
    netProfit: record.netProfit,
    periodCount: record.periodCount,
    anomalyCount: record.anomalyCount,
    goalAmount: record.goalAmount ?? undefined,
    aiSummary: record.aiSummary ?? undefined,
    recentPeriods: record.recentPeriods as DataSnapshot["recentPeriods"],
  };
}

export async function saveSnapshot(
  data: Omit<DataSnapshot, "id" | "createdAt">,
): Promise<DataSnapshot> {
  const record = await prisma.snapshot.upsert({
    where: { userId: data.userId },
    update: {
      totalRevenue: data.totalRevenue,
      totalExpenses: data.totalExpenses,
      netProfit: data.netProfit,
      periodCount: data.periodCount,
      anomalyCount: data.anomalyCount,
      goalAmount: data.goalAmount,
      aiSummary: data.aiSummary,
      recentPeriods: data.recentPeriods,
      createdAt: new Date(),
    },
    create: {
      userId: data.userId,
      totalRevenue: data.totalRevenue,
      totalExpenses: data.totalExpenses,
      netProfit: data.netProfit,
      periodCount: data.periodCount,
      anomalyCount: data.anomalyCount,
      goalAmount: data.goalAmount,
      aiSummary: data.aiSummary,
      recentPeriods: data.recentPeriods,
    },
  });

  return toDataSnapshot(record);
}

export async function getSnapshot(
  userId: string,
): Promise<DataSnapshot | null> {
  const record = await prisma.snapshot.findUnique({
    where: { userId },
  });

  if (!record) return null;
  return toDataSnapshot(record);
}

export async function getAllSnapshots(): Promise<DataSnapshot[]> {
  const records = await prisma.snapshot.findMany();
  return records.map(toDataSnapshot);
}

export async function saveUserAlertConfig(
  data: UserAlertConfig,
): Promise<UserAlertConfig> {
  const record = await prisma.userAlertConfig.upsert({
    where: { userId: data.userId },
    update: {
      email: data.email,
      enableAnomalyAlerts: data.enableAnomalyAlerts,
      enableDailyDigest: data.enableDailyDigest,
    },
    create: {
      userId: data.userId,
      email: data.email,
      enableAnomalyAlerts: data.enableAnomalyAlerts,
      enableDailyDigest: data.enableDailyDigest,
    },
  });

  return {
    userId: record.userId,
    email: record.email,
    enableAnomalyAlerts: record.enableAnomalyAlerts,
    enableDailyDigest: record.enableDailyDigest,
  };
}

export async function getUserAlertConfig(
  userId: string,
): Promise<UserAlertConfig | null> {
  const record = await prisma.userAlertConfig.findUnique({
    where: { userId },
  });

  if (!record) return null;

  return {
    userId: record.userId,
    email: record.email,
    enableAnomalyAlerts: record.enableAnomalyAlerts,
    enableDailyDigest: record.enableDailyDigest,
  };
}

export async function getAllUserAlertConfigs(): Promise<UserAlertConfig[]> {
  const records = await prisma.userAlertConfig.findMany();
  return records.map((record) => ({
    userId: record.userId,
    email: record.email,
    enableAnomalyAlerts: record.enableAnomalyAlerts,
    enableDailyDigest: record.enableDailyDigest,
  }));
}
