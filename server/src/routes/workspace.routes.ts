import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getWorkspaceMembers,
  updateMemberRole,
} from "../services/workspace.service"; // <-- inviteMember ELIMINADO
import { PrismaClient, Role } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /members - Obtiene todos los miembros del workspace del usuario actual
router.get("/members", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.workspaceId) {
      res.status(400).json({ error: "Usuario sin workspace" });
      return;
    }

    const members = await getWorkspaceMembers(user.workspaceId);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /members/:id/role - Actualiza el rol de un miembro
router.put("/members/:id/role", authMiddleware, async (req, res) => {
  try {
    const adminUserId = req.userId;
    const targetUserId = req.params.id as string;
    const { role } = req.body;

    if (!adminUserId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    // Verificamos que el rol sea uno de los permitidos por Prisma
    if (!Object.values(Role).includes(role)) {
      res.status(400).json({ error: "Rol inválido" });
      return;
    }

    const updatedUser = await updateMemberRole(adminUserId, targetUserId, role);
    res.json({ message: "Rol actualizado exitosamente", user: updatedUser });
  } catch (error: any) {
    if (
      error.message.includes("No tienes permisos") ||
      error.message.includes("no pertenece") ||
      error.message.includes("OWNER")
    ) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// NOTA: La ruta POST /invite ha sido eliminada de aquí porque ahora
// usamos el sistema de códigos en invitation.routes.ts

export default router;
