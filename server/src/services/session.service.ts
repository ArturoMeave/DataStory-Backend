import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

function parseBrowser(userAgent: string): string {
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "Navegador desconocido";
}

function parseDevice(userAgent: string): string {
  if (userAgent.includes("Mobile")) return "Móvil";
  if (userAgent.includes("Tablet")) return "Tablet";
  return "Ordenador";
}

export async function createSession(
  userId: string,
  userAgent: string,
  ip: string,
): Promise<string> {
  const sessionToken = uuidv4();

  await prisma.session.create({
    data: {
      userId,
      token: sessionToken,
      device: parseDevice(userAgent),
      browser: parseBrowser(userAgent),
      ip,
    },
  });

  return sessionToken;
}

export async function getUserSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, isActive: true },
    orderBy: { lastUsed: "desc" },
  });
}

export async function revokeSession(sessionId: string, userId: string) {
  return prisma.session.updateMany({
    where: { id: sessionId, userId },
    data: { isActive: false },
  });
}

export async function revokeAllSessions(userId: string, exceptToken?: string) {
  return prisma.session.updateMany({
    where: {
      userId,
      isActive: true,
      ...(exceptToken && { token: { not: exceptToken } }),
    },
    data: { isActive: false },
  });
}

export async function updateSessionLastUsed(token: string) {
  await prisma.session.updateMany({
    where: { token },
    data: { lastUsed: new Date() },
  });
}
