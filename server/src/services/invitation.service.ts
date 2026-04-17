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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  return await prisma.invitation.create({
    data: { code, workspaceId: admin.workspaceId, role, expiresAt },
  });
}

// Función 2: Lee el código y te dice de qué empresa es (para mostrar en el Frontend)
export async function validateInvitation(code: string) {
  const inv = await prisma.invitation.findUnique({
    where: { code },
    include: { workspace: true }, // Traemos los datos de la empresa también
  });

  if (!inv)
    throw new Error("El código de invitación no existe.");
    
  if (inv.expiresAt < new Date()) {
    throw new Error("El código de invitación ha expirado.");
  }

  return { workspaceName: inv.workspace.name, role: inv.role };
}

// Lógica Compartida Segura: Vincula un usuario a una empresa mediante una invitación
export async function processTeamJoining(tx: any, code: string, user: any, force: boolean = false) {
  const invitation = await tx.invitation.findUnique({ where: { code } });
  
  if (!invitation) throw new Error("El código de invitación es inválido o ya fue usado.");
  if (invitation.expiresAt < new Date()) throw new Error("La invitación ha expirado.");

  if (user.workspaceId === invitation.workspaceId) {
    // Si ya es parte del mismo workspace, no le degradamos el rol (si era OWNER se queda OWNER)
    await tx.invitation.delete({ where: { id: invitation.id } });
    return user;
  }

  if (user.workspaceId && user.workspaceId !== invitation.workspaceId && !force) {
    const error: any = new Error("Ya perteneces a un equipo. Si te unes a este nuevo equipo, perderás el acceso a tus datos actuales. ¿Deseas continuar?");
    error.requiresConfirmation = true;
    error.code = "DOUBLE_WORKSPACE";
    throw error;
  }

  const updatedUser = await tx.user.update({
    where: { id: user.id },
    data: { workspaceId: invitation.workspaceId, role: invitation.role },
  });

  await tx.invitation.delete({ where: { id: invitation.id } });

  return updatedUser;
}

// Función 3: El usuario entrega el código, entra a la empresa y el código se destruye
export async function acceptInvitation(userId: string, code: string, force: boolean = false) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Usuario no encontrado.");
    return await processTeamJoining(tx, code, user, force);
  });
}
