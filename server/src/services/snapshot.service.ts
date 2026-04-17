import { PrismaClient, Snapshot } from "@prisma/client";
import type { DataSnapshot, UserAlertConfig } from "../types";

const prisma = new PrismaClient();

function toDataSnapshot(record: Snapshot): DataSnapshot {
  return {
    id: record.id,
    userId: record.uploadedById || record.workspaceId,
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
  data: Omit<DataSnapshot, "id" | "createdAt" | "userId">,
  userId: string,
): Promise<DataSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });

  if (!user || !user.workspaceId) {
    throw new Error("El usuario no tiene una Oficina/Workspace asignado.");
  }

  // Ahora CREAMOS en lugar de actualizar, para permitir Historial
  const record = await prisma.snapshot.create({
    data: {
      workspaceId: user.workspaceId,
      uploadedById: userId,
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

// Nueva función de apoyo para el Share
export async function getSnapshotById(
  id: string,
): Promise<DataSnapshot | null> {
  const record = await prisma.snapshot.findUnique({ where: { id } });
  if (!record) return null;
  return toDataSnapshot(record);
}

// Retorna ahora el historial completo del Workspace
export async function getSnapshotsHistory(
  userId: string,
): Promise<DataSnapshot[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });

  if (!user || !user.workspaceId) return [];

  const records = await prisma.snapshot.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return records.map(toDataSnapshot);
}

// ... A partir de aquí mantén todo lo referente a UserAlertConfig idéntico como lo tenías:
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
  const record = await prisma.userAlertConfig.findUnique({ where: { userId } });
  if (!record) return null;
  return {
    userId: record.userId,
    email: record.email,
    enableAnomalyAlerts: record.enableAnomalyAlerts,
    enableDailyDigest: record.enableDailyDigest,
  };
}

export async function getAllSnapshots(): Promise<DataSnapshot[]> {
  const records = await prisma.snapshot.findMany({
    orderBy: { createdAt: "desc" },
  });
  return records.map(toDataSnapshot);
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

export async function deleteSnapshot(id: string, userId: string) {
  const snapshot = await prisma.snapshot.findUnique({
    where: { id },
  });

  if (!snapshot) throw new Error("No encontrado");

  // Usamos el nombre real de tu base de datos: uploadedById
  if (snapshot.uploadedById !== userId) {
    throw new Error("No autorizado");
  }

  return await prisma.snapshot.delete({
    where: { id },
  });
}
