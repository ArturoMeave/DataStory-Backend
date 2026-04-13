import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { generateSecret, generateURI, verify } from "otplib";
import qrcode from "qrcode";
import { createSession } from "./session.service";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET no está definido.");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export function generateToken(
  userId: string,
  email: string,
  trustedUntil?: number,
  sessionId?: string,
): string {
  const payload: Record<string, unknown> = { userId, email };
  if (trustedUntil) payload.twoFactorTrustedUntil = trustedUntil;
  if (sessionId) payload.sessionId = sessionId;
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
}

export function verifyToken(token: string): {
  userId: string;
  email: string;
  sessionId?: string;
} {
  const decoded = jwt.verify(token, JWT_SECRET as string) as unknown as {
    userId: string;
    email: string;
    sessionId?: string;
  };
  return decoded;
}

export async function registerUser(
  email: string,
  password: string,
  name?: string,
): Promise<{
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role?: string;
    isTwoFactorEnabled?: boolean;
    twoFactorFrequency?: string;
  };
}> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Este email ya está registrado.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: "OWNER",
      workspace: {
        create: {
          name: "Mi Empresa",
        },
      },
    },
  });

  const token = generateToken(user.id, user.email);

  return {
    token,
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name,
      role: user.role,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      twoFactorFrequency: (user as any).twoFactorFrequency,
    },
  };
}

export async function loginUser(
  email: string,
  password: string,
  userAgent: string = "Desconocido",
  ip: string = "Desconocida",
): Promise<{
  token?: string;
  requiresTwoFactor?: boolean;
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role?: string;
    isTwoFactorEnabled?: boolean;
    twoFactorFrequency?: string;
  };
}> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (
    !user ||
    !user.password ||
    !(await bcrypt.compare(password, user.password))
  ) {
    throw new Error("Email o contraseña incorrectos.");
  }

  if (user.isTwoFactorEnabled) {
    return {
      requiresTwoFactor: true,
      userId: user.id,
    };
  }

  await createSession(user.id, userAgent, ip);

  const sessions = await prisma.session.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  const sessionId = sessions[0]?.id;

  const token = generateToken(user.id, user.email);

  return {
    token,
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name,
      role: user.role,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      twoFactorFrequency: (user as any).twoFactorFrequency,
    },
  };
}

export async function generateTwoFactorSecret(userId: string, email: string) {
  const secret = generateSecret();

  const otpauthUrl = generateURI({
    issuer: "DataStory",
    label: email,
    secret: secret,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });

  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

  return { secret, qrCodeDataUrl };
}

export async function verifyTwoFactorToken(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.twoFactorSecret) {
    throw new Error("El usuario no tiene 2FA configurado.");
  }

  const isValid = verify({
    token: token,
    secret: user.twoFactorSecret,
  });

  if (!isValid) {
    throw new Error("El código introducido no es válido o ha expirado.");
  }

  return user;
}

export async function update2FAFrequency(
  userId: string,
  token: string,
  frequency: string,
): Promise<void> {
  await verifyTwoFactorToken(userId, token);

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorFrequency: frequency } as any,
  });
}
