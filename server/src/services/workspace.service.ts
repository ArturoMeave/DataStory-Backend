import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

export async function getWorkspaceMembers(workspaceId: string) {
  return await prisma.user.findMany({
    where: { workspaceId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function updateMemberRole(
  adminUserId: string,
  targetUserId: string,
  newRole: Role,
) {
  const admin = await prisma.user.findUnique({ where: { id: adminUserId } });

  if (!admin || !admin.workspaceId) {
    throw new Error("El administrador no tiene un workspace válido.");
  }

  // 1. Verificamos que el que ejecuta la acción sea al menos ADMIN
  if (admin.role !== Role.ADMIN && admin.role !== Role.OWNER) {
    throw new Error("No tienes permisos suficientes.");
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!target || target.workspaceId !== admin.workspaceId) {
    throw new Error("El usuario no pertenece a este workspace.");
  }

  // 2. LA PROTECCIÓN SUPREMA: Nadie puede modificar al OWNER, ni siquiera otro ADMIN.
  if (target.role === Role.OWNER) {
    throw new Error(
      "No puedes cambiar el rol del creador (OWNER) de la empresa.",
    );
  }

  // 3. Un ADMIN normal no puede ascender a alguien a OWNER. Solo el OWNER puede ceder su empresa.
  if (newRole === Role.OWNER && admin.role !== Role.OWNER) {
    throw new Error("Solo el dueño actual puede nombrar a un nuevo dueño.");
  }

  return await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
    select: { id: true, name: true, email: true, role: true },
  });
}
