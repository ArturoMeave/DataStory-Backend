import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { sendSessionRevokedAlert } from "./email.service";

const prisma = new PrismaClient();

function parseBrowser(userAgent: string): string {
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  return "Navegador desconocido";
}

function parseDevice(userAgent: string): string {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Android/i.test(userAgent)) return "Android";
  if (/Mobile/i.test(userAgent)) return "Móvil";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Mac/i.test(userAgent)) return "Mac";
  if (/Linux/i.test(userAgent)) return "Linux";
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

export async function revokeSessionWithVerification(
  sessionId: string,
  userId: string,
  password: string,
): Promise<void> {
  // 1. Verificamos la contraseña del usuario
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) throw new Error("Usuario no encontrado.");

  // Si el usuario tiene contraseña (no es de Google), la verificamos
  if (user.password) {
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error("Contraseña incorrecta.");
  }

  // 2. Obtenemos los datos de la sesión antes de revocarla
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId, isActive: true },
  });

  if (!session) throw new Error("Sesión no encontrada.");

  // 3. Revocamos la sesión
  await prisma.session.updateMany({
    where: { id: sessionId, userId },
    data: { isActive: false },
  });

  // 4. Enviamos email de alerta si el usuario tiene email de alertas configurado
  try {
    await sendSessionRevokedAlert(
      user.email,
      session.device,
      session.browser,
      session.ip,
    );
  } catch {
    // El email falla silenciosamente para no interrumpir el flujo
    console.error("[session] Error enviando email de alerta");
  }
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
