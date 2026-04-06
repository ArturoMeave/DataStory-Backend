import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET no está definido.");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET as string, {
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

  // CREAMOS EL WORKSPACE Y EL USUARIO AL MISMO TIEMPO (Nuestra Oficina Y Empleado)
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: "ADMIN",
      workspace: {
        create: {
          name: "Mi Empresa", // Nombre por defecto amigable
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
  token: string;
  user: { id: string; email: string; name: string | null };
}> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Email o contraseña incorrectos.");
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
