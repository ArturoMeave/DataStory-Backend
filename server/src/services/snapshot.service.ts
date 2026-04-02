import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Guarda o actualiza el snapshot del usuario.
// Upsert significa "actualiza si existe, crea si no existe".
// Cada usuario solo tiene un snapshot — el más reciente.
export async function saveSnapshot(data: {
  userId: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  periodCount: number;
  anomalyCount: number;
  goalAmount?: number;
  aiSummary?: string;
  recentPeriods: Array<{ date: string; revenue: number; expenses: number }>;
}) {
  return prisma.snapshot.upsert({
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
}

export async function getSnapshot(userId: string) {
  return prisma.snapshot.findUnique({
    where: { userId },
  });
}

export async function getAllSnapshots() {
  return prisma.snapshot.findMany({
    include: { user: { select: { email: true } } },
  });
}

export async function saveUserAlertConfig(data: {
  userId: string;
  email: string;
  enableAnomalyAlerts: boolean;
  enableDailyDigest: boolean;
}) {
  return prisma.userAlertConfig.upsert({
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
}

export async function getUserAlertConfig(userId: string) {
  return prisma.userAlertConfig.findUnique({
    where: { userId },
  });
}

export async function getAllUserAlertConfigs() {
  return prisma.userAlertConfig.findMany();
}
