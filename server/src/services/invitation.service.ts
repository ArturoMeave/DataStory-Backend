import { PrismaClient, Role } from "@prisma/client";
import crypto from "crypto"; // Herramienta de Node para generar textos aleatorios seguros

const prisma = new PrismaClient();

// Función 1: Crea un código nuevo y lo guarda en la base de datos
export async function generateInvitation(adminUserId: string, role: Role) {
  const admin = await prisma.user.findUnique({ where: { id: adminUserId } });

  if (
    !admin ||
    !admin.workspaceId ||
    (admin.role !== Role.ADMIN && admin.role !== Role.OWNER)
  ) {
    throw new Error("Solo los administradores pueden generar invitaciones.");
  }

  // Generamos un código de 8 caracteres al azar (Ej. A1B2C3D4)
  const code = crypto.randomBytes(4).toString("hex").toUpperCase();

  return await prisma.invitation.create({
    data: { code, workspaceId: admin.workspaceId, role },
  });
}

// Función 2: Lee el código y te dice de qué empresa es (para mostrar en el Frontend)
export async function validateInvitation(code: string) {
  const inv = await prisma.invitation.findUnique({
    where: { code },
    include: { workspace: true }, // Traemos los datos de la empresa también
  });

  if (!inv)
    throw new Error("El código de invitación es inválido o ya fue usado.");

  return { workspaceName: inv.workspace.name, role: inv.role };
}

// Función 3: El usuario entrega el código, entra a la empresa y el código se destruye
export async function acceptInvitation(userId: string, code: string) {
  const inv = await prisma.invitation.findUnique({ where: { code } });
  if (!inv)
    throw new Error("El código de invitación es inválido o ya fue usado.");

  // Actualizamos al usuario metiéndolo en la empresa y dándole el rol
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { workspaceId: inv.workspaceId, role: inv.role },
  });

  // DESTRUIMOS el código para que nadie más pueda usarlo (Un solo uso)
  await prisma.invitation.delete({ where: { id: inv.id } });

  return updatedUser;
}
