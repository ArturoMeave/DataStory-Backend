import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getWorkspaceMembers,
  updateMemberRole,
} from "../services/workspace.service";
import { PrismaClient, Role } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

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

router.put("/members/:id/role", authMiddleware, async (req, res) => {
  try {
    const adminUserId = req.userId;
    const targetUserId = req.params.id as string;
    const { role } = req.body;

    if (!adminUserId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

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

export default router;
