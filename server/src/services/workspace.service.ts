import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

export async function getWorkspaceMembers(workspaceId: string) {
  return await prisma.user.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function updateMemberRole(
  adminUserId: string,
  targetUserId: string,
  newRole: Role
) {
  // 1. Verificamos quién hace la petición
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
  });

  if (!admin || !admin.workspaceId) {
    throw new Error("El administrador no fue encontrado o no tiene un workspace válido.");
  }

  // 2. Aquí está la protección de la ruta (Regla de negocio principal)
  if (admin.role !== Role.ADMIN) {
    throw new Error("No tienes permisos suficientes (se requiere ADMIN).");
  }

  // 3. Verificamos el usuario a modificar (y que pertenezca al mismo workspace)
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!target || target.workspaceId !== admin.workspaceId) {
    throw new Error("El usuario objetivo no pertenece a este workspace o no existe.");
  }

  // 4. Actualizamos
  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    }
  });

  return updatedUser;
}

export async function inviteMember(
  adminUserId: string,
  email: string,
  role: Role
) {
  // 1. Verificamos admin
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
  });

  if (!admin || !admin.workspaceId) {
    throw new Error("El administrador no fue encontrado o no tiene un workspace válido.");
  }

  // Protección de permisos
  if (admin.role !== Role.ADMIN) {
    throw new Error("No tienes permisos suficientes para invitar usuarios (se requiere ADMIN).");
  }

  // 2. Buscamos si el email existe
  const targetUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!targetUser) {
    // Si no existe, simulamos la regla de negocio lanzando error en vez de enviar correo
    throw new Error("El usuario debe registrarse primero. (Simulación)");
  }

  // 3. Asignamos al workspace actual
  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      workspaceId: admin.workspaceId,
      role: role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    }
  });

  return updatedUser;
}
