import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { generateSecret, generateURI, verify } from "otplib";
import qrcode from "qrcode";

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
): string {
  const payload: Record<string, unknown> = { userId, email };
  if (trustedUntil) payload.twoFactorTrustedUntil = trustedUntil;
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
}

export async function registerUser(
  email: string,
  password: string,
  name?: string,
): Promise<{
  token: string;
  user: { id: string; email: string; name: string | null };
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
      role: "ADMIN",
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
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{
  token?: string;
  requiresTwoFactor?: boolean;
  userId?: string;
  user?: { id: string; email: string; name: string | null };
}> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (
    !user ||
    !user.password ||
    !(await bcrypt.compare(password, user.password))
  ) {
    throw new Error("Email o contraseña incorrectos.");
  }

  // LA SALA DE ESPERA: Si el usuario tiene el candado puesto, no le damos la llave todavía.
  if (user.isTwoFactorEnabled) {
    return {
      requiresTwoFactor: true,
      userId: user.id,
    };
  }

  const token = generateToken(user.id, user.email);

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export function verifyToken(token: string): { userId: string; email: string } {
  const decoded = jwt.verify(token, JWT_SECRET as string) as unknown as {
    userId: string;
    email: string;
  };
  return decoded;
}

// ==========================================
// 2FA LOGIC (LÓGICA DEL DOBLE FACTOR)
// ==========================================

export async function generateTwoFactorSecret(userId: string, email: string) {
  // 1. Creamos la "semilla" matemática única para este usuario
  const secret = generateSecret();

  // 2. Preparamos los datos para que la app de Google Authenticator los entienda
  const otpauthUrl = generateURI({
    issuer: "DataStory",
    label: email,
    secret: secret,
  });

  // Guardamos la semilla pero AÚN NO habilitamos el 2FA
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });

  // 3. Dibujamos la imagen del código de barras (QR)
  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

  return { secret, qrCodeDataUrl };
}

export async function verifyTwoFactorToken(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.twoFactorSecret) {
    throw new Error("El usuario no tiene 2FA configurado.");
  }

  // 4. El guardia comprueba si los 6 números que da el usuario coinciden con la semilla
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
  // Primero verificamos que el código sea correcto (misma protección que al hacer login)
  await verifyTwoFactorToken(userId, token);

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorFrequency: frequency } as any,
  });
}
